use std::collections::HashMap;

use crate::app::modules::repositories::models::VersionResult;

use super::interfaces::IRepository;
use super::models::ModResult;

pub struct RepositoryService {
    repositories: HashMap<String, Box<dyn IRepository>>,
}

impl RepositoryService {
    pub fn new() -> Self {
        Self {
            repositories: HashMap::new(),
        }
    }

    pub fn with_provider(mut self, name: &str, provider: Box<dyn IRepository>) -> Self {
        self.repositories.insert(name.to_lowercase(), provider);
        self
    }

    fn get_provider(&self, name: &str) -> Option<&Box<dyn IRepository>> {
        self.repositories.get(&name.to_lowercase())
    }

    pub async fn search(&self, query: &str, page: usize) -> Vec<ModResult> {
        let mut results = Vec::new();
        for provider in self.repositories.values() {
            let mut r = provider.search(query, page).await;
            results.append(&mut r);
        }
        results
    }

    /// Find a mod by slug — currently checks only the first registered provider
    pub async fn find(&self, slug: &str) -> Option<ModResult> {
        let provider = self.repositories.values().next()?;
        provider.find(slug).await
    }

    pub async fn get_versions(
        &self,
        project_id: &str,
        game_versions: &[String],
        loaders: &[String],
    ) -> Vec<VersionResult> {
        let (provider_name, clean_id) = match project_id.split_once(':') {
            Some((prov, id)) => (prov.to_lowercase(), id),
            None => ("modrinth".to_string(), project_id),
        };

        let mut results = Vec::new();

        if let Some(provider) = self.get_provider(&provider_name) {
            let mut r = provider
                .get_versions(clean_id, game_versions, loaders)
                .await;
            results.append(&mut r);
        }

        results
    }
}
