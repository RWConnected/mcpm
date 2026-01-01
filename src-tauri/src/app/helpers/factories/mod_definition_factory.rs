use crate::app::config::Config;
use crate::app::modules::repositories::models::VersionResult;
use sha2::{Digest, Sha512};
use std::fs;

#[cfg(test)]
#[derive(Clone)]
pub struct ModFactory {
    pub id: String,
    pub version: String,
    pub minecraft_versions: Vec<String>,
    pub url: String,
    pub content: Vec<u8>,
}

#[cfg(test)]
impl ModFactory {
    /// Minimal constructor – this should be your default in tests
    pub fn new(id: impl Into<String>, version: impl Into<String>) -> Self {
        let id = id.into();
        let version = version.into();
        Self {
            url: format!("https://example.invalid/{}-{}.jar", id, version),
            minecraft_versions: vec!["1.21.11".to_string()],
            content: format!("{id}@{version}").into_bytes(),
            id,
            version,
        }
    }

    /// Override Minecraft compatibility
    pub fn for_mc_versions(mut self, versions: &[&str]) -> Self {
        self.minecraft_versions = versions.iter().map(|v| v.to_string()).collect();
        self
    }

    /// Override file contents (hash-sensitive tests)
    pub fn with_content(mut self, bytes: impl Into<Vec<u8>>) -> Self {
        self.content = bytes.into();
        self
    }

    /// Create a cached version of the test mod
    pub fn seed_cache(&self) -> &Self {
        fs::write(
            Config::cache_path().join(&self.filename()),
            &self.content)
        .unwrap();
        self
    }

    /// Create an installed version of the test mod
    pub fn seed_mod(&self) -> &Self {
        fs::write(Config::mods_path().join(&self.filename()), &self.content).unwrap();
        self
    }

    /// Filename exactly as MCPM expects it on disk
    pub fn filename(&self) -> String {
        format!("{}-{}.jar", &self.id, &self.version)
    }

    /// Hash exactly as lockfile expects
    pub fn hash(&self) -> String {
        let mut h = Sha512::new();
        h.update(&self.content);
        format!("{:x}", h.finalize())
    }

    pub fn to_version_result(&self) -> VersionResult {
        VersionResult{
            mod_id: self.id.clone(),
            version: self.version.clone(),
            minecraft_versions: self.minecraft_versions.clone(),
            url: self.url.clone(),
            hash: self.hash(),
        }
    }
}