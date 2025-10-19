use futures::stream::{FuturesUnordered, StreamExt};

use crate::app::{
    helpers::{as_str, semver::resolve_version},
    modules::{
        core::ops::manager::ModManager,
        manifest::models::{ModEntry, VersionSpec},
    },
};

#[derive(Debug, Clone)]
pub struct OutdatedEntry {
    pub key: String,
    pub current: String,
    pub wanted: Option<String>, // latest within spec
    pub latest: Option<String>, // latest overall
}

#[derive(Debug, Clone, Default)]
pub struct OutdatedResult {
    pub outdated: Vec<OutdatedEntry>,
    pub total_checked: usize,
}

pub struct Outdated;

impl Outdated {
    pub async fn run(mods: Vec<String>) -> Result<OutdatedResult, String> {
        let mut manager = ModManager::load()
            .await
            .map_err(|e| format!("Failed to initialize ModManager: {}", e))?;

        let to_check: Vec<_> = if mods.is_empty() {
            manager.manifest.mods_as_entries()
        } else {
            manager
                .manifest
                .mods_as_entries()
                .into_iter()
                .filter(|m| mods.iter().any(|q| m.slug.contains(q)))
                .collect()
        };

        if to_check.is_empty() {
            return Err("No matching mods found to check for updates".into());
        }

        let mut result = OutdatedResult {
            outdated: vec![],
            total_checked: to_check.len(),
        };

        // Concurrently check each mod for updates
        let mut checks = to_check
            .into_iter()
            .map(|m| {
                // Move the cloned ModEntry into the async block
                let manager_ref = &manager;
                async move { Self::check_mod(manager_ref, m.clone()).await }
            })
            .collect::<FuturesUnordered<_>>();

        while let Some(entry) = checks.next().await {
            if let Some(e) = entry {
                result.outdated.push(e);
            }
        }

        result.outdated.sort_by(|a, b| a.key.cmp(&b.key));

        Ok(result)
    }

    async fn check_mod(manager: &ModManager, m: ModEntry) -> Option<OutdatedEntry> {
        let key = m.to_key();
        let lock_entry = manager.lock_service.lock.mods.get(&key)?;

        let versions = manager
            .repo_service
            .get_versions(
                &key,
                &[manager.manifest.minecraft_version.clone()],
                &[as_str(&manager.manifest.modloader)],
            )
            .await;
        if versions.is_empty() {
            return None;
        }

        let latest = versions.first().map(|v| v.version.clone());
        let wanted = match &m.version {
            VersionSpec::Range(spec) => {
                resolve_version(spec.as_str(), &versions).map(|v| v.version.clone())
            }
            VersionSpec::Exact(_) => Some(lock_entry.version.clone()),
        };

        let current = &lock_entry.version;
        if wanted.as_ref().map_or(false, |w| w != current)
            || latest.as_ref().map_or(false, |l| l != current)
        {
            Some(OutdatedEntry {
                key,
                current: current.clone(),
                wanted,
                latest,
            })
        } else {
            None
        }
    }
}
