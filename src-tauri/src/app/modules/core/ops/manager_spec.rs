#[cfg(test)]
mod tests {
    use serial_test::serial;
    use std::fs;

    use crate::app::helpers::factories::{LockfileFactory, ManifestFactory, ModFactory};
    use crate::app::modules::core::ops::manager::ModManager;
    use crate::app::{Config, TestContext};
    use tokio;

    #[tokio::test]
    #[serial]
    async fn lockfile_mods_are_sorted_by_name() {
        let _ctx = TestContext::new().await;

        // Manifest order intentionally scrambled
        let mut mods = Vec::new();
        mods.push(ModFactory::new("modrinth:z-mod", "1.0.0"));
        mods.push(ModFactory::new("modrinth:a-mod", "1.0.0"));
        mods.push(ModFactory::new("modrinth:m-mod", "1.0.0"));

        ManifestFactory::new("1.21.11").with_mods(&mods).write();
        LockfileFactory::new().with_mods(&mods).write();

        // Load + save to trigger MCPM's lockfile serialization
        let mut manager = ModManager::new();
        manager.load().await;
        manager.save_all().unwrap();

        // Assert lockfile ordering
        let lock = fs::read_to_string(Config::lock_path()).unwrap();

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
        let _ctx = TestContext::new().await;

        let mut mods = Vec::new();
        mods.push(ModFactory::new("modrinth:z-mod", "1.0.0"));
        mods.push(ModFactory::new("modrinth:a-mod", "1.0.0"));
        mods.push(ModFactory::new("modrinth:m-mod", "1.0.0"));
        mods.push(ModFactory::new("modrinth:i-mod", "1.0.0"));

        ManifestFactory::new("1.21.11").with_mods(&mods).write();
        LockfileFactory::new().with_mods(&mods).write();

        let expected_manifest = fs::read_to_string(Config::manifest_path()).unwrap();

        // Load + save to trigger MCPM's manifest file serialization
        let mut manager = ModManager::new();
        manager.load().await;
        manager.save_all().unwrap();

        // Assert manifest ordering
        let manifest = fs::read_to_string(Config::manifest_path()).unwrap();

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
