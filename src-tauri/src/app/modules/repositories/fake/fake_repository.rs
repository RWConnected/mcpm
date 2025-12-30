use async_trait::async_trait;

use crate::app::modules::repositories::{
    interfaces::IRepository,
    models::{ModResult, VersionResult},
};

/// Fake repository used for testing.
/// Versions are keyed by Minecraft version.
#[derive(Default)]
pub struct FakeRepository {
    versions: Vec<VersionResult>,
}

impl FakeRepository {
    pub fn new() -> Self {
        Self { versions: vec![] }
    }

    pub fn with_versions(mut self, versions: Vec<VersionResult>) -> Self {
        self.versions = versions;
        self
    }
}

#[async_trait]
impl IRepository for FakeRepository {
    async fn search(&self, _query: &str, _page: usize) -> Vec<ModResult> {
        vec![]
    }

    async fn find(&self, _slug: &str) -> Option<ModResult> {
        None
    }

    async fn get_versions(
        &self,
        _project_id: &str,
        game_versions: &[String],
        _loaders: &[String],
    ) -> Vec<VersionResult> {
        self.versions
            .iter()
            .filter(|v| {
                v.minecraft_versions
                    .iter()
                    .any(|mc| game_versions.contains(mc))
            })
            .cloned()
            .collect()
    }
}
