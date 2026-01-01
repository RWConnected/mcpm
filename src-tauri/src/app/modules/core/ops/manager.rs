use crate::app::modules::core::download::{DownloadService, HttpDownloadService};
use crate::app::modules::repositories::interfaces::IRepository;
use crate::app::modules::{
    lock::services::LockService,
    manifest::{models::ModEntry, ManifestService},
    repositories::{models::VersionResult, modrinth::ModrinthRepository, RepositoryService},
};
use crate::app::Config;
use std::io::Result;

pub struct ModManager {
    pub manifest_service: ManifestService,
    pub lock_service: LockService,
    pub repo_service: RepositoryService,
    pub download_service: Box<dyn DownloadService>,
}

impl ModManager {

    pub fn new() -> Self {
        Self {
            manifest_service: ManifestService::new(),
            lock_service: LockService::new(),
            repo_service: RepositoryService::new(),
            download_service: Box::new(HttpDownloadService),
        }
    }

    pub fn with_default_providers(&mut self) -> &Self {
        self.repo_service.with_provider("modrinth", Box::new(ModrinthRepository::new()));
        self
    }

    pub fn with_provider(&mut self, name: &str, provider: Box<dyn IRepository>) -> &Self {
        self.repo_service.with_provider(name, provider);
        self
    }

    pub fn with_download_service(&mut self, service: Box<dyn DownloadService>) -> &Self {
        self.download_service = service;
        self
    }

    pub async fn load(&mut self) {
        self.lock_service.load()
            .expect(&format!("Failed to load {}", Config::lock_path().display()));
        self.manifest_service.load()
            .expect(&format!("Failed to load {}", Config::manifest_path().display()));
    }

    pub fn manifest_mod_entries(&self) -> Vec<ModEntry> {
        self.manifest_service.manifest.mods_as_entries()
    }

    pub async fn refresh_mod(
        &mut self,
        entry: &ModEntry,
        available: Option<&[VersionResult]>,
        upgrade: bool,
        ignore_constraints: bool,
    ) -> Result<()> {
        let success = self
            .lock_service
            .update_entry(
                entry,
                &mut self.manifest_service.manifest,
                &self.repo_service,
                available,
                upgrade,
                ignore_constraints
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
        self.manifest_service.save()?;
        self.lock_service.save()?;
        Ok(())
    }
}
