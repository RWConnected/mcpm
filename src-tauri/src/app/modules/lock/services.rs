use super::models::{LockEntry, LockFile};
use crate::app::{helpers::{
    as_str,
    semver::{compare_versions, resolve_version, satisfies},
}, modules::{
    io::use_io,
    manifest::models::{Manifest, ModEntry, VersionSpec},
    repositories::{models::VersionResult, RepositoryService},
}, Config};
use std::collections::{BTreeMap, HashMap};

pub struct LockService {
    pub lock: LockFile,
}

impl LockService {
    pub fn exists() -> bool {
        Config::lock_path().exists()
    }

    pub fn load() -> Self {
        let path = Config::lock_path();
        let lock = std::fs::read_to_string(path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or(LockFile {
                mods: HashMap::new(),
            });

        Self { lock }
    }

    pub fn save(&self) -> std::io::Result<()> {
        let mut sorted_mods = BTreeMap::new();

        for (id, entry) in &self.lock.mods {
            sorted_mods.insert(id.clone(), entry.clone());
        }

        let lock = serde_json::json!({
            "mods": sorted_mods
        });

        let path = Config::lock_path();
        std::fs::write(path, serde_json::to_string_pretty(&lock)?)?;
        Ok(())
    }

    pub async fn update_entry(
        &mut self,
        manifest_mod: &ModEntry,
        manifest: &Manifest,
        repo_service: &RepositoryService,
        available: Option<&[VersionResult]>,
        upgrade: bool,
        ignore_constraints: bool,
    ) -> bool {
        let io = use_io();

        let key = manifest_mod.to_key();

        let prev = &self.lock.mods.get(&key);

        let version_outdated = match prev {
            Some(entry) => !satisfies(&manifest_mod.version, &entry.version),
            None => true,
        };
        let project_id = match prev {
            Some(entry) => &entry.id,
            None => &manifest_mod.slug,
        };

        if !upgrade && !version_outdated {
            // Silently skipping, version satisfies spec and no upgrade requested
            return true;
        }

        let versions: Vec<VersionResult> = match available {
            Some(v) => v.to_vec(),
            None => {
                repo_service
                    .get_versions(
                        &project_id,
                        &[manifest.minecraft_version.clone()],
                        &[as_str(&manifest.modloader)],
                    )
                    .await
            }
        };

        if versions.is_empty() {
            io.error(
                &format!("No compatible versions found for '{}'", manifest_mod.slug),
                None,
            );
            return false;
        }

        let resolved = match (ignore_constraints, &manifest_mod.version) {
            (true, _) => versions
                .iter()
                .max_by(|a, b| compare_versions(&a.version, &b.version))
                .cloned(),
            (false, VersionSpec::Exact(v)) => versions.iter().find(|vr| &vr.version == v).cloned(),
            (false, VersionSpec::Range(r)) => resolve_version(r.as_str(), &versions),
        };

        match resolved {
            Some(resolved) => {
                self.lock.mods.insert(
                    key,
                    LockEntry {
                        id: resolved.mod_id,
                        version: resolved.version,
                        url: resolved.url,
                        minecraft_versions: resolved.minecraft_versions,
                        hash: resolved.hash,
                    },
                );
            }
            None => {
                io.error(
                    &format!(
                        "Failed to resolve '{}' with version spec {:?}",
                        manifest_mod.slug, manifest_mod.version
                    ),
                    None,
                );
            }
        }

        return true;
    }

    // Use this in install and upgrade commands
    pub async fn refresh(
        &mut self,
        manifest: &Manifest,
        repo_service: &RepositoryService,
        upgrade: bool,
    ) -> bool {
        let mut success = true;
        for m in &manifest.mods_as_entries() {
            if !self
                .update_entry(m, manifest, repo_service, None, upgrade, false)
                .await
            {
                success = false;
            }
        }
        return success;
    }

    pub fn get_version(&self, manifest_mod: &ModEntry) -> Option<String> {
        let key = manifest_mod.to_key();
        self.lock.mods.get(&key).map(|entry| entry.version.clone())
    }
}
