use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// A single resolved dependency
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LockEntry {
    pub id: String,      // Identifier that never changes (as backup)
    pub version: String, // resolved version
    pub minecraft_versions: Vec<String>,
    pub url: String,
    pub hash: String,
}

/// The lock file structure
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LockFile {
    // pub manifest_version: String, // from manifest.version
    // pub minecraft_version: String,
    pub mods: HashMap<String, LockEntry>,
}
