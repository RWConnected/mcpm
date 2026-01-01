use crate::app::helpers::factories::ModFactory;
use crate::app::Config;
use indexmap::IndexMap;
use serde::Serialize;
use std::fs;

#[cfg(test)]
pub struct ManifestFactory {
    mc_version: String,
    mods: Vec<ModFactory>,
}

#[cfg(test)]
impl ManifestFactory {
    pub fn new(mc_version: impl Into<String>) -> Self {
        Self {
            mc_version: mc_version.into(),
            mods: Vec::new(),
        }
    }

    pub fn with_mod(mut self, m: &ModFactory) -> Self {
        self.mods.push(m.clone());
        self
    }

    pub fn with_mods(mut self, mods: &Vec<ModFactory>) -> Self {
        self.mods = mods.clone();
        self
    }

    pub fn write(self) {
        let manifest_mods: IndexMap<String, String> = self
            .mods
            .iter()
            .map(|m| (m.id.clone(), m.version.clone()))
            .collect();

        let manifest = TestManifest {
            name: "Pack",
            version: "1.0.0",
            side: "both",
            modloader: "fabric",
            minecraft_version: &self.mc_version,
            default_provider: "modrinth",
            mods: &manifest_mods,
        };

        fs::write(
            Config::manifest_path(),
            serde_json::to_string_pretty(&manifest).unwrap(),
        )
            .unwrap();
    }
}

#[cfg(test)]
#[derive(Serialize)]
struct TestManifest<'a> {
    name: &'a str,
    version: &'a str,
    side: &'a str,
    modloader: &'a str,
    minecraft_version: &'a str,
    default_provider: &'a str,
    mods: &'a IndexMap<String, String>,
}
