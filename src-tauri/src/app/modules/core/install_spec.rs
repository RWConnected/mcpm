#[cfg(test)]
mod tests {
    use crate::app::helpers::factories::FakeRepository;
    use crate::app::helpers::factories::LockfileFactory;
    use crate::app::helpers::factories::ManifestFactory;
    use crate::app::helpers::factories::ModFactory;
    use crate::app::modules::core::download::FakeDownloadService;
    use crate::app::modules::core::install::Install;
    use crate::app::modules::core::ops::manager::ModManager;
    use crate::app::{Config, TestContext};
    use serial_test::serial;
    use tokio;

    #[tokio::test]
    #[serial]
    async fn install_removes_old_versions_when_package_updates() {
        let _ctx = TestContext::new().await;

        let minecraft_version = "1.21.11";
        let mod_id = "modrinth:mod";
        let v1 = ModFactory::new(mod_id, "1.0.0");
        let v2 = ModFactory::new(mod_id, "2.0.0");

        let mut manager = ModManager::new();
        manager.with_provider("modrinth", Box::new(FakeRepository::new()
            .with_version(&v1)
            .with_version(&v2)
        ));
        manager.with_download_service(Box::new(FakeDownloadService::new()
            .with_mod(&v1)
            .with_mod(&v2)
        ));

        LockfileFactory::new().with_mod(&v1).write();
        ManifestFactory::new(minecraft_version).with_mod(&v1).write();
        manager.load().await;

        // Install v1 of the mod
        Install::run_with_manager(&mut manager, false, false).await.expect("install v1 failed");

        assert!(
            Config::mods_path().join(v1.filename()).exists(),
            "v1 jar does not exist in the mods directory"
        );

        LockfileFactory::new().with_mod(&v2).write();
        ManifestFactory::new(minecraft_version).with_mod(&v2).write();
        manager.load().await;

        // Update v1 to v2
        Install::run_with_manager(&mut manager, false, false).await.expect("install v2 failed");

        assert!(
            Config::mods_path().join(v2.filename()).exists(),
            "v2 jar does not exist in the mods directory"
        );

        assert!(
            !Config::mods_path().join(v1.filename()).exists(),
            "Old version still present; expected cleanup to remove {}",
            v1.filename()
        );
    }

    #[tokio::test]
    #[serial]
    async fn install_removes_entries_not_in_manifest_from_lockfile_and_mods_folder() {
        let _ctx = TestContext::new().await;

        let minecraft_version = "1.21.11";
        let mod_a = ModFactory::new("modrinth:a", "1.0.0");
        let mod_b = ModFactory::new("modrinth:b", "1.0.0");
        mod_a.seed_mod();
        mod_b.seed_mod();

        let mut manager = ModManager::new();
        manager.with_provider("modrinth", Box::new(FakeRepository::new()
            .with_version(&mod_a)
            .with_version(&mod_b)
        ));
        manager.with_download_service(Box::new(FakeDownloadService::new()
            .with_mod(&mod_a)
            .with_mod(&mod_b)
        ));

        LockfileFactory::new()
            .with_mod(&mod_a)
            .with_mod(&mod_b)
            .write();
        ManifestFactory::new(minecraft_version)
            .with_mod(&mod_a)
            .write();
        manager.load().await;

        Install::run_with_manager(&mut manager, false, false)
            .await
            .expect("upgrade after MC bump failed");

        // Reload disk changes
        manager.load().await;

        assert!(manager.lock_service.lock.mods.contains_key(&mod_a.id));
        assert!(
            !manager.lock_service.lock.mods.contains_key(&mod_b.id),
            "Lockfile still contains mod removed from manifest"
        );

        assert!(
            Config::mods_path().join(mod_a.filename()).exists(),
            "Expected installed mod file missing"
        );
        assert!(
            !Config::mods_path().join(mod_b.filename()).exists(),
            "Stale mod file was not removed"
        );
    }
}
