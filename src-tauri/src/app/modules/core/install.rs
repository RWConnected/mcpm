use reqwest::Client;
use sha2::{Digest, Sha512};
use std::{
    env, fs,
    io::Write,
    path::{Path, PathBuf},
};

// modules/core/install.rs
use crate::app::{
    modules::{core::ops::manager::ModManager, io::use_io},
    Config,
};

pub struct Install;

impl Install {
    pub async fn run(no_cache: bool, force_rehash: bool) -> Result<(), String> {
        let io = use_io();

        let mut manager = ModManager::load()
            .await
            .map_err(|e| format!("Failed to initialize ModManager: {}", e))?;

        let mods = manager.manifest.mods_as_entries();

        for entry in &mods {
            manager
                .refresh_mod(entry, None, false)
                .await
                .map_err(|e| format!("Failed to resolve {}: {}", entry.slug, e))?;
        }

        manager
            .save_all()
            .map_err(|e| format!("Failed to save state: {}", e))?;

        let cache_dir = &Config::get().cache_dir;
        let mods_dir = &Config::get().mods_dir;
        fs::create_dir_all(&cache_dir).ok();
        fs::create_dir_all(&mods_dir).ok();

        // Fail if one of the existing mods have an invalid hash.
        if !force_rehash {
            for (key, entry) in &manager.lock_service.lock.mods {
                let mod_path = mods_dir.join(format!("{}-{}.jar", key, entry.version));
                let cache_path = cache_dir.join(format!("{}-{}.jar", key, entry.version));

                for p in [&mod_path, &cache_path] {
                    if p.exists() && !Self::verify_file_hash(p, &entry.hash)? {
                        return Err(format!(
                            "Hash mismatch for {}. Re-run with --force-rehash to continue.",
                            key
                        ));
                    }
                }
            }
        }

        let mut expected_mod_files = Vec::<PathBuf>::new();

        // 2. Download mods
        for (key, entry) in &manager.lock_service.lock.mods {
            let file_name = format!("{}-{}.jar", key, entry.version);
            let target_path = mods_dir.join(&file_name);
            let cache_path = cache_dir.join(&file_name);
            expected_mod_files.push(target_path.clone());

            let dest = if no_cache { &target_path } else { &cache_path };
            if !dest.exists() || force_rehash {
                io.info(&format!("Downloading {} {}", key, entry.version));
                Self::download_to(dest, &entry.url, &entry.hash).await?;
            }

            if !no_cache {
                fs::copy(&cache_path, &target_path)
                    .map_err(|e| format!("Copy failed for {}: {}", key, e))?;
            }
        }

        // 3. Remove outdated mod files
        for entry in
            fs::read_dir(&mods_dir).map_err(|e| format!("Failed to read mods directory: {}", e))?
        {
            let path = entry.map_err(|e| e.to_string())?.path();
            if path.is_file() {
                if !expected_mod_files.contains(&path) {
                    fs::remove_file(&path)
                        .map_err(|e| format!("Failed to remove outdated mod {:?}: {}", path, e))?;
                }
            }
        }

        Ok(())
    }

    fn verify_file_hash(path: &Path, expected: &str) -> Result<bool, String> {
        use sha2::{Digest, Sha512};
        use std::fs;

        let bytes = fs::read(path).map_err(|e| e.to_string())?;
        let mut hasher = Sha512::new();
        hasher.update(&bytes);
        let actual = format!("{:x}", hasher.finalize());

        Ok(actual == expected)
    }

    pub async fn download_to(path: &Path, url: &str, expected_hash: &str) -> Result<(), String> {
        let bytes = Client::new()
            .get(url)
            .send()
            .await
            .map_err(|e| e.to_string())?
            .bytes()
            .await
            .map_err(|e| e.to_string())?;
        let mut file = fs::File::create(path).map_err(|e| e.to_string())?;
        file.write_all(&bytes).map_err(|e| e.to_string())?;

        let mut hasher = Sha512::new();
        hasher.update(&bytes);
        let actual_hash = format!("{:x}", hasher.finalize());
        if actual_hash != expected_hash {
            return Err(format!("Hash mismatch for {:?}", path));
        }
        Ok(())
    }
}
