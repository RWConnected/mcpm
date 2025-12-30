use super::models::{ModResult, VersionResult};

use async_trait::async_trait;

#[async_trait]
pub trait IRepository: Send + Sync {
    async fn search(&self, query: &str, page: usize) -> Vec<ModResult>;
    async fn find(&self, slug: &str) -> Option<ModResult>;

    /**
     * Get versions for a given mod.
     *
     * @param project_id The ID of the mod project.
     * @param game_versions An array of Minecraft versions to filter by
     * @param loaders Array of mod loaders to filter by
     * @returns An array of version results
     */
    async fn get_versions(
        &self,
        project_id: &str,
        game_versions: &[String],
        loaders: &[String],
    ) -> Vec<VersionResult>;
}
