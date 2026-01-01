use super::DownloadService;
use async_trait::async_trait;
use std::path::Path;

pub struct HttpDownloadService;

#[async_trait]
impl DownloadService for HttpDownloadService {
    async fn download(
        &self,
        url: &str,
        dest: &Path,
        expected_hash: &str,
    ) -> Result<(), String> {
        let bytes = reqwest::get(url)
            .await
            .map_err(|e| e.to_string())?
            .bytes()
            .await
            .map_err(|e| e.to_string())?;


        if !super::validate_hash(&bytes, expected_hash) {
            return Err(format!("Hash mismatch for {:?}", dest));
        }

        tokio::fs::write(dest, &bytes)
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }
}
