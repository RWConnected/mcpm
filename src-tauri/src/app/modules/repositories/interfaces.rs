use super::models::{ModResult, VersionResult};

use async_trait::async_trait;

#[async_trait]
pub trait IRepository: Send + Sync {
    async fn search(&self, query: &str, page: usize) -> Vec<ModResult>;
    async fn find(&self, slug: &str) -> Option<ModResult>;

    async fn get_versions(
        &self,
        project_id: &str,
        game_versions: &[String],
        loaders: &[String],
    ) -> Vec<VersionResult>;
}
