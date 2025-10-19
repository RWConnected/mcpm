use crate::app::modules::{
    lock::services::LockService,
    manifest::{models::ModEntry, ManifestService},
    repositories::{models::VersionResult, modrinth::ModrinthRepository, RepositoryService},
};
use std::io::Result;

pub struct ModManager {
    pub manifest_service: ManifestService,
    pub manifest: crate::app::modules::manifest::models::Manifest,
    pub lock_service: LockService,
    pub repo_service: RepositoryService,
}

impl ModManager {
    pub async fn load() -> Result<Self> {
        let manifest_service = ManifestService::new();
        let manifest = manifest_service.load()?;
        let repo_service =
            RepositoryService::new().with_provider("modrinth", Box::new(ModrinthRepository::new()));
        let lock_service = LockService::load();

        Ok(Self {
            manifest_service,
            manifest,
            lock_service,
            repo_service,
        })
    }

    pub async fn refresh_mod(
        &mut self,
        entry: &ModEntry,
        available: Option<&[VersionResult]>,
        upgrade: bool,
    ) -> Result<()> {
        let success = self
            .lock_service
            .update_entry(
                entry,
                &self.manifest,
                &self.repo_service,
                available,
                upgrade,
            )
            .await;
        if !success {
            return Err(std::io::Error::new(
                std::io::ErrorKind::Other,
                "update failed",
            ));
        }
        Ok(())
    }

    pub fn save_all(&self) -> Result<()> {
        self.manifest_service.save(&self.manifest)?;
        self.lock_service.save()?;
        Ok(())
    }
}
