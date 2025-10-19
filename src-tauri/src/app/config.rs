use dirs;
use once_cell::sync::OnceCell;
use std::{
    env,
    path::{Path, PathBuf},
};

use crate::app::commands::Cli;

#[derive(Clone, Debug)]
pub struct Config {
    pub verbose: bool,
    pub quiet: bool,
    pub cache_dir: PathBuf,
    pub output_dir: PathBuf,
    pub mods_dir: PathBuf,
}

static CONFIG: OnceCell<Config> = OnceCell::new();

impl Config {
    pub fn init(cli: &Cli) {
        let cache_dir = Self::resolve_cache_dir(cli.cache_dir.clone());
        let output_dir = Self::resolve_output_dir(cli.output_dir.clone());
        let mods_dir = Self::resolve_mods_dir(cli.mods_dir.clone(), &output_dir);
        let verbose = cli.verbose.clone();
        let quiet = cli.quiet.clone();

        CONFIG
            .set(Self {
                verbose,
                quiet,
                cache_dir,
                output_dir,
                mods_dir,
            })
            .ok();
    }

    pub fn get() -> &'static Self {
        CONFIG.get().expect("GlobalConfig not initialized")
    }

    fn resolve_cache_dir(cli_cache: Option<String>) -> PathBuf {
        if let Some(c) = cli_cache {
            return PathBuf::from(c);
        }
        if let Ok(env_path) = env::var("MCPM_CACHE_DIR") {
            return PathBuf::from(env_path);
        }
        if let Some(home) = dirs::home_dir() {
            return home.join(".mcpm/cache");
        }
        PathBuf::from(".mcpm/cache")
    }

    fn resolve_output_dir(cli_output: Option<String>) -> PathBuf {
        if let Some(o) = cli_output {
            return PathBuf::from(o);
        }
        if let Ok(env_path) = env::var("MCPM_OUTPUT_DIR") {
            return PathBuf::from(env_path);
        }
        env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
    }

    fn resolve_mods_dir(cli_mods: Option<String>, output_dir: &Path) -> PathBuf {
        // Priority 1: explicit CLI
        if let Some(m) = cli_mods {
            let p = PathBuf::from(&m);
            return if p.is_absolute() {
                p
            } else {
                output_dir.join(p)
            };
        }

        // Priority 2: environment variable
        if let Ok(env_path) = env::var("MCPM_MODS_DIR") {
            let p = PathBuf::from(env_path);
            return if p.is_absolute() {
                p
            } else {
                output_dir.join(p)
            };
        }

        // Default: relative to output directory
        output_dir.join("mods")
    }
}
