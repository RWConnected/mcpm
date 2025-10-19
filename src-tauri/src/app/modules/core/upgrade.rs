use crate::app::modules::core::ops::manager::ModManager;
use std::collections::HashMap;

pub struct UpgradeResult {
    pub upgraded: Vec<(String, Option<String>, Option<String>)>, // key, before, after
    pub unchanged: usize,
}

pub struct Upgrade;

impl Upgrade {
    pub async fn run(mods: &[String]) -> Result<UpgradeResult, String> {
        let mut manager = ModManager::load()
            .await
            .map_err(|e| format!("Failed to initialize ModManager: {}", e))?;

        let all_mods = manager.manifest.mods_as_entries();
        let to_upgrade: Vec<_> = if mods.is_empty() {
            all_mods
        } else {
            all_mods
                .into_iter()
                .filter(|m| mods.iter().any(|q| m.slug.contains(q)))
                .collect()
        };

        if to_upgrade.is_empty() {
            return Err("No matching mods found to upgrade".into());
        }

        let before_versions: HashMap<_, _> = to_upgrade
            .iter()
            .filter_map(|m| manager.lock_service.get_version(m).map(|v| (m.to_key(), v)))
            .collect();

        for entry in &to_upgrade {
            manager
                .refresh_mod(entry, None, true)
                .await
                .map_err(|e| format!("Failed to refresh {}: {}", entry.slug, e))?;
        }

        manager
            .save_all()
            .map_err(|e| format!("Failed to save lockfile: {}", e))?;

        let mut upgraded = vec![];
        let mut unchanged = 0;

        for entry in &to_upgrade {
            let key = entry.to_key();
            let before = before_versions.get(&key).cloned();
            let after = manager.lock_service.get_version(entry);

            if before != after {
                upgraded.push((key, before, after));
            } else {
                unchanged += 1;
            }
        }

        Ok(UpgradeResult {
            upgraded,
            unchanged,
        })
    }
}
