use crate::app::modules::{core::ops::manager::ModManager, manifest::models::Provider};

pub struct Remove;

impl Remove {
    pub async fn run(slug: String, provider: Option<Provider>) -> Result<Option<String>, String> {
        let mut manager = ModManager::new();
        manager.load().await;
        manager.with_default_providers(); // TODO: Check if required

        let provider = provider.unwrap_or(manager.manifest_service.manifest.default_provider.clone());
        if !manager.manifest_service.manifest.remove_mod_entry(&provider, &slug) {
            return Ok(Some(format!("Mod '{}' not found in manifest", slug)));
        }

        manager.lock_service.lock.mods.remove(&slug);
        manager
            .save_all()
            .map_err(|e| format!("Failed to save state: {}", e))?;

        Ok(None)
    }
}
