use async_trait::async_trait;
use std::path::Path;

#[async_trait]
pub trait DownloadService: Send + Sync {
    async fn download(
        &self,
        url: &str,
        dest: &Path,
        expected_hash: &str,
    ) -> Result<(), String>;
}
