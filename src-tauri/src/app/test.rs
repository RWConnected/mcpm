use crate::app::commands::Cli;
use crate::app::modules::io::init_io;
use crate::app::modules::io::traits::IOConfig;
use crate::app::Config;
use std::path::PathBuf;
use tempfile::tempdir;

#[cfg(test)]
pub struct TestContext {
    _temp: tempfile::TempDir,
    pub root: PathBuf,
}

#[cfg(test)]
impl TestContext {
    pub async fn new() -> Self {
        let temp = tempdir().unwrap();
        let root = temp.path().to_path_buf();

        Self::init_config(&root).await;

        Self {
            _temp: temp, // KEEP IT
            root,
        }
    }

    async fn init_config(root: &PathBuf) {
        let cache_dir = root.join("cache");
        let mods_dir = root.join("mods");

        let cli = Cli {
            verbose: false,
            quiet: true,
            cache_dir: Some(cache_dir.to_string_lossy().to_string()),
            project_dir: Some(root.to_string_lossy().to_string()),
            output_dir: Some(root.to_string_lossy().to_string()),
            mods_dir: Some(mods_dir.to_string_lossy().to_string()),
            command: None,
            modrinth_token: None,
        };

        Config::reset_for_tests();
        Config::init(&cli);
        init_io(IOConfig {
            verbose: false,
            quiet: true,
        })
            .await;
    }
}
