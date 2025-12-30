#[cfg(test)]
mod tests {
    use indexmap::IndexMap;
    use serial_test::serial;
    use std::fs;
    use tempfile::tempdir;

    use tokio;

    use crate::app::helpers::test_utils::{init_config, make_lock, make_manifest};
    use crate::app::modules::core::ops::manager::ModManager;

    #[tokio::test]
    #[serial]
    async fn lockfile_mods_are_sorted_by_name() {
        let temp = tempdir().unwrap();
        let root = temp.path().to_path_buf();

        init_config(&root).await;

        // Manifest order intentionally scrambled
        let mut mods = IndexMap::new();
        mods.insert("modrinth:z-mod".into(), "1.0.0".into());
        mods.insert("modrinth:a-mod".into(), "1.0.0".into());
        mods.insert("modrinth:m-mod".into(), "1.0.0".into());

        make_manifest(&root, "1.21.11", &mods);
        make_lock(&root, &mods);

        // Load + save to trigger MCPM's lockfile serialization
        let manager = ModManager::load().await.unwrap();
        manager.save_all().unwrap();

        // Assert lockfile ordering
        let lock = fs::read_to_string(root.join("mcpm.lock")).unwrap();

        let a = lock.find("modrinth:a-mod").unwrap();
        let m = lock.find("modrinth:m-mod").unwrap();
        let z = lock.find("modrinth:z-mod").unwrap();

        assert!(
            a < m && m < z,
            "Lockfile mods are not sorted alphabetically:\n{}",
            lock
        );
    }

    #[tokio::test]
    #[serial]
    async fn manifest_mod_order_is_preserved() {
        let temp = tempdir().unwrap();
        let root = temp.path().to_path_buf();

        init_config(&root).await;

        // Manifest order intentionally scrambled
        let mut mods = IndexMap::new();
        mods.insert("modrinth:z-mod".into(), "1.0.0".into());
        mods.insert("modrinth:a-mod".into(), "1.0.0".into());
        mods.insert("modrinth:m-mod".into(), "1.0.0".into());
        mods.insert("modrinth:i-mod".into(), "1.0.0".into());

        make_manifest(&root, "1.21.11", &mods);
        make_lock(&root, &mods);
        let expected_manifest = fs::read_to_string(root.join("mcpm.json")).unwrap();

        // Load + save to trigger MCPM's manifest file serialization
        let manager = ModManager::load().await.unwrap();
        manager.save_all().unwrap();

        // Assert manifest ordering
        let manifest = fs::read_to_string(root.join("mcpm.json")).unwrap();

        let a = manifest.find("modrinth:z-mod").unwrap();
        let b = manifest.find("modrinth:a-mod").unwrap();
        let c = manifest.find("modrinth:m-mod").unwrap();
        let d = manifest.find("modrinth:i-mod").unwrap();

        assert!(
            a < b && b < c && c < d,
            "Custom order in manifest mods is lost.\nExpected:\n{}\nActual:\n{}",
            expected_manifest,
            manifest,
        );
    }
}
