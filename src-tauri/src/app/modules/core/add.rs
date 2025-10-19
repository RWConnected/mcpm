use crate::app::{
    helpers::{
        as_str,
        cli::{pick, pick_with_pagination},
        semver::is_semver_range,
    },
    modules::{
        core::ops::manager::ModManager,
        manifest::models::{ModEntry, Provider, VersionSpec},
        repositories::{models::VersionResult, modrinth::ModrinthRepository, RepositoryService},
    },
};

pub struct Add;

impl Add {
    pub async fn run(
        id: &String,
        version: Option<String>,
        provider: Option<Provider>,
        exact: bool,
        search: bool,
    ) -> Result<(), String> {
        let mut manager = ModManager::load()
            .await
            .map_err(|e| format!("Failed to initialize ModManager: {}", e))?;

        let provider = provider.unwrap_or(manager.manifest.default_provider.clone());
        let repo_service =
            RepositoryService::new().with_provider("modrinth", Box::new(ModrinthRepository::new()));

        let project = if search {
            pick_with_pagination(
                |page| {
                    let service_ref = &repo_service;
                    async move { service_ref.search(&id, page).await }
                },
                "Select a project",
                |m| format!("[{}] {} ({})", m.source, m.name, m.url),
            )
            .await
            .ok_or_else(|| format!("No mod found for '{}'", id))?
        } else {
            repo_service
                .find(&id)
                .await
                .ok_or_else(|| format!("No mod found for '{}'", id))?
        };

        let versions = repo_service
            .get_versions(
                &project.id,
                &[manager.manifest.minecraft_version.clone()],
                &[as_str(&manager.manifest.modloader)],
            )
            .await;

        if versions.is_empty() {
            return Err(format!(
                "No compatible versions found for '{}' with Minecraft {} + {:?}",
                project.name, manager.manifest.minecraft_version, manager.manifest.modloader
            ));
        }

        let chosen = pick_version(
            &version,
            &versions,
            &project.name,
            &manager.manifest.minecraft_version,
        )
        .ok_or_else(|| "Version selection cancelled".to_string())?;

        let version_spec = resolve_version_spec(&version, &chosen.version, exact);

        let entry = ModEntry {
            slug: project.slug.clone(),
            version: version_spec,
            provider: provider.clone(),
        };

        manager.manifest.insert_mod_entry(&entry);

        manager
            .refresh_mod(&entry, Some(&versions), false)
            .await
            .map_err(|e| format!("Failed to update lockfile: {}", e))?;

        manager
            .save_all()
            .map_err(|e| format!("Failed to save lock file: {}", e))?;
        Ok(())
    }
}

fn resolve_version_spec(requested: &Option<String>, chosen: &str, exact: bool) -> VersionSpec {
    match requested {
        Some(v) if is_semver_range(v) => VersionSpec::Range(v.clone()),
        Some(_) if exact => VersionSpec::Exact(chosen.to_string()),
        Some(_) => VersionSpec::Range(format!("^{}", chosen)),
        None if exact => VersionSpec::Exact(chosen.to_string()),
        None => VersionSpec::Range(format!("^{}", chosen)),
    }
}

fn pick_version(
    requested: &Option<String>,
    versions: &[VersionResult],
    project_name: &str,
    minecraft_version: &str,
) -> Option<VersionResult> {
    match requested {
        Some(r) => versions
            .iter()
            .find(|v| &v.version == r)
            .cloned()
            .or_else(|| {
                pick(
                    versions,
                    &format!(
                        "Requested version '{}' not found for '{}' with Minecraft '{}'. Pick a compatible version",
                        r, project_name, minecraft_version
                    ),
                    |m| format!("{} [{}]", m.version, m.minecraft_versions.join(", ")),
                )
            }),
        None => versions.first().cloned(),
    }
}
