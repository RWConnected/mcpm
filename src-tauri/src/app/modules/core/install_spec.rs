#[cfg(test)]
mod tests {
    use std::{fs, path::PathBuf};
    use tempfile::tempdir;

    use sha2::{Digest, Sha512};
    use tokio;

    use crate::app::{
        commands::Cli,
        modules::{core::install::Install, io::init_io},
        Config,
    };

    // Verify that a basic install works
    // Re-running install without manifest changes should not rewrite or redownload anything
    //

    #[tokio::test]
    async fn install_removes_old_versions_when_package_updates() {
        // Arrange: temp workspace
        let temp = tempdir().unwrap();
        let root = temp.path().to_path_buf();
        std::env::set_current_dir(&root).unwrap(); // Install reads mcpm.json/mcpm.lock from CWD

        // Set config and IO once for the test
        set_config(&root).await;

        // First state: version 1.0.0
        make_manifest(&root, "1.0.0");
        let v1_bytes = b"jar-v1";
        make_lock(&root, "1.0.0", v1_bytes);
        seed_cache(&root, "1.0.0", v1_bytes);

        // Act 1: run install → copies v1 from cache to mods/
        fs::create_dir_all(root.join("mods")).unwrap();
        Install::run(false, false).await.expect("install v1 failed");

        let v1_path = root.join("mods").join("modrinth:testmod-1.0.0.jar");
        assert!(
            v1_path.exists(),
            "v1 jar does not exist in the mods directory"
        );

        // Second state: bump to version 2.0.0
        make_manifest(&root, "2.0.0");
        let v2_bytes = b"jar-v2";
        make_lock(&root, "2.0.0", v2_bytes);
        seed_cache(&root, "2.0.0", v2_bytes);

        // Act 2: run install again → installs v2 but does not remove v1 (current bug)
        Install::run(false, false).await.expect("install v2 failed");

        let v2_path = root.join("mods").join("modrinth:testmod-2.0.0.jar");
        assert!(
            v2_path.exists(),
            "v2 jar does not exist in the mods directory"
        );

        assert!(
            !v1_path.exists(),
            "Old version still present; expected cleanup to remove {}",
            v1_path.display()
        );
    }

    async fn set_config(root: &PathBuf) {
        // Point all paths into the temp workspace
        let cli = Cli {
            verbose: false,
            quiet: true,
            cache_dir: Some(root.join("cache").to_string_lossy().to_string()),
            output_dir: Some(root.to_string_lossy().to_string()),
            mods_dir: Some(root.join("mods").to_string_lossy().to_string()),
            command: None,
        };
        Config::init(&cli);
        init_io(crate::app::modules::io::traits::IOConfig {
            verbose: false,
            quiet: true,
        })
        .await;
    }

    fn make_manifest(root: &PathBuf, version: &str) {
        // Minimal, valid manifest that avoids network by using an exact version
        // and a provider-mapped key "modrinth:testmod".
        let manifest = serde_json::json!({
            "name": "Pack",
            "version": "1.0.0",
            "side": "both",
            "modloader": "fabric",
            "minecraft_version": "1.21.7",
            "default_provider": "modrinth",
            "mods": {
                "modrinth:testmod": version
            }
        });
        write_json(&root.join("mcpm.json"), &manifest);
    }

    fn make_lock(root: &PathBuf, version: &str, bytes: &[u8]) {
        let hash = sha512_hex(bytes);
        let lock = serde_json::json!({
            "mods": {
                "modrinth:testmod": {
                    "id": "modrinth:testmod",
                    "version": version,
                    "minecraft_versions": ["1.21.7"],
                    "url": "https://example.invalid/testmod.jar", // never fetched because cache is used
                    "hash": hash
                }
            }
        });
        write_json(&root.join("mcpm.lock"), &lock);
    }

    fn seed_cache(root: &PathBuf, version: &str, bytes: &[u8]) {
        let cache_dir = root.join("cache");
        fs::create_dir_all(&cache_dir).unwrap();
        let fname = format!("modrinth:testmod-{}.jar", version);
        fs::write(cache_dir.join(fname), bytes).unwrap();
    }

    fn write_json(path: &PathBuf, content: &serde_json::Value) {
        fs::write(path, serde_json::to_string_pretty(content).unwrap()).unwrap();
    }

    fn sha512_hex(bytes: &[u8]) -> String {
        let mut h = Sha512::new();
        h.update(bytes);
        format!("{:x}", h.finalize())
    }
}
