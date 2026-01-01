#[cfg(test)]
mod tests {
    use serial_test::serial;

    use crate::app::helpers::factories::FakeRepository;
    use crate::app::helpers::factories::{LockfileFactory, ManifestFactory, ModFactory};
    use crate::app::modules::core::download::FakeDownloadService;
    use crate::app::modules::{
        core::ops::manager::ModManager,
        core::upgrade::Upgrade,
    };
    use crate::app::TestContext;
    use tokio;

    #[tokio::test]
    #[serial]
    async fn upgrade_does_not_upgrade_pinned_mod_versions() {
        let _ctx = TestContext::new().await;

        let mod_id = "modrinth:rwc-gui-shop";
        let initial_version = ModFactory::new(mod_id, "2.0.0+1.21.5");
        let other_version = ModFactory::new(mod_id, "2.0.1+1.21.11");

        let mut manager = ModManager::new();
        manager.with_provider("modrinth", Box::new(FakeRepository::new()
            .with_version(&initial_version)
            .with_version(&other_version)
        ));
        manager.with_download_service(Box::new(FakeDownloadService::new()
            .with_mod(&initial_version)
            .with_mod(&other_version)
        ));

        ManifestFactory::new("1.21.11").with_mod(&initial_version).write();
        LockfileFactory::new().with_mod(&initial_version).write();
        manager.load().await;
        
        let r1 = Upgrade::run_with_manager(&mut manager, &[], false)
            .await
            .expect("upgrade failed");

        assert!(r1.upgraded.is_empty());
    }

    #[tokio::test]
    #[serial]
    async fn upgrade_ignores_version_constrains_when_told_to() {
        let _ctx = TestContext::new().await;

        let mod_id = "modrinth:rwc-gui-shop";
        let initial = ModFactory::new(mod_id, "2.0.0+1.21.5")
            .for_mc_versions(&["1.21.5"]);
        let desired = ModFactory::new(mod_id, "2.0.1+1.21.11")
            .for_mc_versions(&["1.21.11"]);

        let mut manager = ModManager::new();
        manager.with_provider("modrinth", Box::new(FakeRepository::new()
            .with_version(&initial)
            .with_version(&desired)
        ));
        manager.with_download_service(Box::new(FakeDownloadService::new()
            .with_mod(&initial)
            .with_mod(&desired)
        ));

        ManifestFactory::new("1.21.11").with_mod(&initial).write();
        LockfileFactory::new().with_mod(&initial).write();
        manager.load().await;

        // test

        let r2 = Upgrade::run_with_manager(&mut manager, &[], true)
            .await
            .expect("upgrade after MC bump failed");

        assert_eq!(r2.upgraded.len(), 1);

        let (_, before, after) = &r2.upgraded[0];
        assert_eq!(before.as_deref(), Some(initial.version.as_str()));
        assert_eq!(after.as_deref(), Some(desired.version.as_str()));
    }
}
