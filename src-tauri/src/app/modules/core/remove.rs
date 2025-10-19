use crate::app::modules::{core::ops::manager::ModManager, manifest::models::Provider};

pub struct Remove;

impl Remove {
    pub async fn run(slug: String, provider: Option<Provider>) -> Result<Option<String>, String> {
        let mut manager = ModManager::load()
            .await
            .map_err(|e| format!("Failed to initialize ModManager: {}", e))?;

        let provider = provider.unwrap_or(manager.manifest.default_provider.clone());
        if !manager.manifest.remove_mod_entry(&provider, &slug) {
            return Ok(Some(format!("Mod '{}' not found in manifest", slug)));
        }

        manager.lock_service.lock.mods.remove(&slug);
        manager
            .save_all()
            .map_err(|e| format!("Failed to save state: {}", e))?;

        Ok(None)
    }
}
