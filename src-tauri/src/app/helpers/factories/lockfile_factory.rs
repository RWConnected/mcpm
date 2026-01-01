use crate::app::helpers::factories::ModFactory;
use crate::app::Config;
use std::fs;

#[cfg(test)]
pub struct LockfileFactory {
    mods: Vec<ModFactory>,
}

#[cfg(test)]
impl LockfileFactory {
    pub fn new() -> Self {
        Self {
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

    pub fn seed_cache(self) -> Self {
        for m in &self.mods {
            m.seed_cache();
        }
        self
    }

    pub fn seed_mods(self) -> Self {
        for m in &self.mods {
            m.seed_mod();
        }
        self
    }

    pub fn write(self) {
        let mods_json = self
            .mods
            .iter()
            .map(|m| {
                (
                    m.id.clone(),
                    serde_json::json!({
                        "id": m.id,
                        "version": m.version,
                        "minecraft_versions": m.minecraft_versions,
                        "url": m.url,
                        "hash": m.hash(),
                    }),
                )
            })
            .collect::<serde_json::Map<_, _>>();

        let lock = serde_json::json!({ "mods": mods_json });

        fs::write(
            Config::lock_path(),
            serde_json::to_string_pretty(&lock).unwrap(),
        )
            .unwrap();
    }
}