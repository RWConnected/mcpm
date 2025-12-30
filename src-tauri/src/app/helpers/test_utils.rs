use crate::app::commands::Cli;
use crate::app::modules::io::init_io;
use crate::app::modules::io::traits::IOConfig;
use crate::app::Config;
use indexmap::IndexMap;
use serde::Serialize;
use std::fs;
use std::path::PathBuf;

#[cfg(test)]
pub async fn init_config(root: &PathBuf) {
    let cache_dir = root.join("cache");
    let mods_dir = root.join("mods");

    fs::create_dir_all(&root).unwrap();
    fs::create_dir_all(&cache_dir).unwrap();
    fs::create_dir_all(&mods_dir).unwrap();

    let cli = Cli {
        verbose: false,
        quiet: true,
        cache_dir: Some(cache_dir.to_string_lossy().to_string()),
        output_dir: Some(root.to_string_lossy().to_string()),
        mods_dir: Some(mods_dir.to_string_lossy().to_string()),
        command: None,
    };

    Config::reset_for_tests();
    Config::init(&cli);
    init_io(IOConfig {
        verbose: false,
        quiet: true,
    })
        .await;
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

#[cfg(test)]
pub fn make_manifest(root: &PathBuf, mc_version: &str, mods: &IndexMap<String, String>,) {
    let manifest = TestManifest {
            name: "Pack",
            version: "1.0.0",
            side: "both",
            modloader: "fabric",
            minecraft_version: mc_version,
            default_provider: "modrinth",
            mods
    };

    let path = Config::manifest_path();

    fs::write(
        path,
        serde_json::to_string_pretty(&manifest).unwrap(),
    )
        .unwrap();
}

#[cfg(test)]
pub fn make_lock(root: &PathBuf, mods: &IndexMap<String, String>) {
    let mods_json = mods
        .iter()
        .map(|(id, version)| {
            (
                id.clone(),
                serde_json::json!({
                    "id": id,
                    "version": version,
                    "minecraft_versions": [],
                    "url": "https://example.invalid",
                    "hash": "deadbeef"
                }),
            )
        })
        .collect::<serde_json::Map<_, _>>();

    let lock = serde_json::json!({
        "mods": mods_json
    });

    let path = Config::lock_path();

    fs::write(
        path,
        serde_json::to_string_pretty(&lock).unwrap(),
    )
        .unwrap();
}