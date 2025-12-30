#[cfg(test)]
mod tests {
    use indexmap::IndexMap;
    use serial_test::serial;
    use tempfile::tempdir;

    use tokio;

    use crate::app::helpers::test_utils::{init_config, make_lock, make_manifest};
    use crate::app::modules::{
        core::ops::manager::ModManager,
        core::upgrade::Upgrade,
        repositories::{fake::FakeRepository, models::VersionResult, RepositoryService},
    };

    #[tokio::test]
    #[serial]
    async fn upgrade_does_not_upgrade_pinned_mod_versions() {
        // Setup
        let temp = tempdir().unwrap();
        let root = temp.path().to_path_buf();

        init_config(&root).await;

        let initial_version = "2.0.0+1.21.5";
        let other_version = "2.0.1+1.21.11";

        let mut mods = IndexMap::new();
        mods.insert("modrinth:rwc-gui-shop".into(), initial_version.into());

        make_manifest(&root, "1.21.11", &mods);
        make_lock(&root, &mods);

        let fake_repo = FakeRepository::new().with_versions(vec![
            version(initial_version, &["1.21.5"]),
            version(other_version, &["1.21.11"]),
        ]);

        let mut manager = ModManager::load().await.unwrap();
        manager.repo_service =
            RepositoryService::new().with_provider("modrinth", Box::new(fake_repo));

        // test
        
        let r1 = Upgrade::run_with_manager(manager, &[], false)
            .await
            .expect("upgrade failed");

        assert!(r1.upgraded.is_empty());
    }

    #[tokio::test]
    #[serial]
    async fn upgrade_ignores_version_constrains_when_told_to() {
        // setup
        let temp = tempdir().unwrap();
        let root = temp.path().to_path_buf();

        init_config(&root).await;

        let initial_version = "2.0.0+1.21.5";
        let desired_version = "2.0.1+1.21.11";

        let mut mods = IndexMap::new();
        mods.insert("modrinth:rwc-gui-shop".into(), initial_version.into());

        make_manifest(&root, "1.21.11", &mods);
        make_lock(&root, &mods);

        let fake_repo = FakeRepository::new().with_versions(vec![
            version(initial_version, &["1.21.5"]),
            version(desired_version, &["1.21.11"]),
        ]);

        let mut manager = ModManager::load().await.unwrap();
        manager.repo_service =
            RepositoryService::new().with_provider("modrinth", Box::new(fake_repo));

        // test

        let r2 = Upgrade::run_with_manager(manager, &[], true)
            .await
            .expect("upgrade after MC bump failed");

        assert_eq!(r2.upgraded.len(), 1);

        let (_, before, after) = &r2.upgraded[0];
        assert_eq!(before.as_deref(), Some(initial_version));
        assert_eq!(after.as_deref(), Some(desired_version));
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    fn version(v: &str, mc: &[&str]) -> VersionResult {
        VersionResult {
            mod_id: "rwc-gui-shop".into(),
            version: v.into(),
            minecraft_versions: mc.iter().map(|s| s.to_string()).collect(),
            url: "https://example.invalid".into(),
            hash: "deadbeef".into(),
        }
    }
}
