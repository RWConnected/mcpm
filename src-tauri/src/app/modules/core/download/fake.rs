use super::DownloadService;
use crate::app::helpers::factories::ModFactory;
use std::collections::HashMap;
use std::path::Path;


pub struct FakeDownloadService {
    content: HashMap<String,Vec<u8>>,
}

impl FakeDownloadService {
    pub fn new() -> Self {
        Self { content: HashMap::new() }
    }

    pub fn with_content(mut self, url: impl Into<String>, bytes: impl Into<Vec<u8>>) -> Self {
        self.content.insert(url.into(), bytes.into());
        self
    }

    pub fn with_mod(self, m: &ModFactory) -> Self {
        self.with_content(m.url.clone(), m.content.clone())
    }
}

#[async_trait::async_trait]
impl DownloadService for FakeDownloadService {
    async fn download(
        &self,
        _url: &str,
        dest: &Path,
        expected_hash: &str,
    ) -> Result<(), String> {
        let content = self.content
            .get(_url)
            .map(|v| v.as_slice())
            .unwrap_or(b"default_content");

        if !super::validate_hash(&content, expected_hash) {
            return Err(format!("Hash mismatch for {:?}", dest));
        }

        tokio::fs::write(dest, &content).await.unwrap();
        Ok(())
    }
}
