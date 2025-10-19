use std::collections::HashMap;

use clap::ValueEnum;
use serde::{Deserialize, Deserializer, Serialize};
use strum_macros::{Display, EnumString};

use crate::app::{helpers::semver::is_semver_range, modules::io::use_io};

#[derive(Debug, Serialize, Deserialize, Clone, ValueEnum)]
#[serde(rename_all = "lowercase")]
#[clap(rename_all = "lower")]
pub enum Side {
    Client,
    Server,
    Both,
    Unknown,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "lowercase")]
pub enum ModLoader {
    Forge,
    Fabric,
    Quilt,
    NeoForge,
}

#[derive(Debug, Serialize, Deserialize, Clone, ValueEnum, Display, EnumString)]
#[serde(rename_all = "lowercase")]
#[strum(serialize_all = "lowercase")]
#[clap(rename_all = "lower")]
pub enum Provider {
    Modrinth,
    CurseForge,
    Github,
    Maven,
}

#[derive(Debug, Serialize, Clone)]
#[serde(untagged)]
pub enum VersionSpec {
    Exact(String), // "1.2.3"
    Range(String), // "^1.2.0", ">=1.18, <1.20", "*"
}

impl VersionSpec {
    pub fn as_str(&self) -> &str {
        match self {
            VersionSpec::Exact(v) => v,
            VersionSpec::Range(r) => r,
        }
    }
    pub fn to_string(&self) -> String {
        match self {
            VersionSpec::Exact(v) => v.to_string(),
            VersionSpec::Range(r) => r.to_string(),
        }
    }
    pub fn is_semver_range(&self) -> bool {
        matches!(self, VersionSpec::Range(_))
    }
}

impl<'de> Deserialize<'de> for VersionSpec {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        if is_semver_range(&s) {
            Ok(VersionSpec::Range(s))
        } else {
            Ok(VersionSpec::Exact(s))
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModEntry {
    pub slug: String,
    pub version: VersionSpec,
    pub provider: Provider,
}

impl ModEntry {
    pub fn to_key(&self) -> String {
        format!(
            "{}:{}",
            self.provider.to_string().to_lowercase(),
            self.slug.clone()
        )
    }
}

/// Full manifest
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Manifest {
    pub name: String,
    pub version: String,
    pub description: Option<String>,
    pub author: Option<String>,
    pub side: Side,
    pub modloader: ModLoader,
    pub minecraft_version: String,
    pub default_provider: Provider,
    pub mods: HashMap<String, VersionSpec>,
    pub license: Option<String>,
    pub homepage: Option<String>,
    pub tags: Option<Vec<String>>,
}

/// Partial manifest for merging
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct PartialManifest {
    pub name: Option<String>,
    pub version: Option<String>,
    pub description: Option<String>,
    pub author: Option<String>,
    pub side: Option<Side>,
    pub modloader: Option<ModLoader>,
    pub minecraft_version: Option<String>,
    pub default_provider: Option<Provider>,
    pub mods: Option<HashMap<String, VersionSpec>>,
    pub license: Option<String>,
    pub homepage: Option<String>,
    pub tags: Option<Vec<String>>,
}

impl Default for Manifest {
    fn default() -> Self {
        Self {
            name: "My Modpack".to_string(),
            version: "1.0.0".to_string(),
            description: Some("A Minecraft modpack".to_string()),
            author: None,
            side: Side::Both,
            modloader: ModLoader::Fabric,
            minecraft_version: "1.21.7".to_string(),
            default_provider: Provider::Modrinth,
            mods: HashMap::new(),
            license: None,
            homepage: None,
            tags: None,
        }
    }
}

impl Manifest {
    /// Merge a partial manifest with defaults
    pub fn merge(partial: PartialManifest) -> Self {
        let defaults = Manifest::default();

        Manifest {
            name: partial.name.unwrap_or(defaults.name),
            version: partial.version.unwrap_or(defaults.version),
            description: partial.description.or(defaults.description),
            author: partial.author.or(defaults.author),
            side: partial.side.unwrap_or(defaults.side),
            modloader: partial.modloader.unwrap_or(defaults.modloader),
            minecraft_version: partial
                .minecraft_version
                .unwrap_or(defaults.minecraft_version),
            default_provider: partial
                .default_provider
                .unwrap_or(defaults.default_provider),
            mods: partial.mods.unwrap_or(defaults.mods),
            license: partial.license.or(defaults.license),
            homepage: partial.homepage.or(defaults.homepage),
            tags: partial.tags.or(defaults.tags),
        }
    }

    // TODO: Revert slug exclusive change. Use slug for user interaction but save the id in case the slug changes.

    pub fn mods_as_entries(&self) -> Vec<ModEntry> {
        self.mods
            .iter()
            .map(|(key, version)| {
                // split key into provider + slug
                let mut parts = key.splitn(2, ':');
                let provider_str = parts.next().unwrap_or_default();
                let slug = parts.next().unwrap_or_default().to_string();

                let provider = match provider_str {
                    "modrinth" => Provider::Modrinth,
                    "curseforge" => Provider::CurseForge,
                    "github" => Provider::Github,
                    "maven" => Provider::Maven,
                    _ => self.default_provider.clone(),
                };

                ModEntry {
                    slug: slug.clone(),
                    version: version.clone(),
                    provider,
                }
            })
            .collect()
    }

    pub fn insert_mod_entry(&mut self, entry: &ModEntry) {
        let key = entry.to_key();
        self.mods.insert(key, entry.version.clone());
    }

    /// Remove a mod by ID or slug, returns true if removed
    pub fn remove_mod_entry(&mut self, provider: &Provider, slug: &str) -> bool {
        let io = use_io();

        let key = format!("{}:{}", provider, slug);
        if self.mods.remove(&key).is_some() {
            io.success(&format!("Removed {}", key));
            true
        } else {
            io.warn(&format!("No entry found for {}", key));
            false
        }
    }
}

impl PartialManifest {
    /// Extract a PartialManifest safely from any JSON value
    pub fn from_value(value: serde_json::Value) -> Self {
        Self {
            name: value
                .get("name")
                .and_then(|v| v.as_str().map(|s| s.to_string())),
            version: value
                .get("version")
                .and_then(|v| v.as_str().map(|s| s.to_string())),
            description: value
                .get("description")
                .and_then(|v| v.as_str().map(|s| s.to_string())),
            author: value
                .get("author")
                .and_then(|v| v.as_str().map(|s| s.to_string())),
            side: value
                .get("side")
                .and_then(|v| serde_json::from_value(v.clone()).ok()),
            modloader: value
                .get("modloader")
                .and_then(|v| serde_json::from_value(v.clone()).ok()),
            minecraft_version: value
                .get("minecraft_version")
                .and_then(|v| v.as_str().map(|s| s.to_string())),
            default_provider: value
                .get("default_provider")
                .and_then(|v| serde_json::from_value(v.clone()).ok()),
            mods: value
                .get("mods")
                .and_then(|v| serde_json::from_value(v.clone()).ok()),
            license: value
                .get("license")
                .and_then(|v| v.as_str().map(|s| s.to_string())),
            homepage: value
                .get("homepage")
                .and_then(|v| v.as_str().map(|s| s.to_string())),
            tags: value
                .get("tags")
                .and_then(|v| serde_json::from_value(v.clone()).ok()),
        }
    }
}
