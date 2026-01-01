use crate::app::modules::io::use_io;
use crate::app::modules::manifest::models::{Manifest, PartialManifest};
use crate::app::Config;
use std::fs;
use std::io;
use std::io::Write;
use std::path::Path;

const RECOMMENDED_IGNORES: [&str; 4] = ["mods/", "crash-reports/", "logs/", "saves/"];

pub struct ManifestService {
    pub manifest: Manifest
}

impl ManifestService {
    pub fn new() -> Self {
        Self {
            manifest: Manifest::default()
        }
    }

    /// Initialize a manifest (create or normalize) and handle .gitignore
    pub fn init(&self) -> std::io::Result<()> {
        let manifest_path = Config::manifest_path();
        let gitignore_path = Config::gitignore_path();

        if !manifest_path.exists() {
            self.save()?;
        } else {
            self.normalize(&manifest_path)?;
        }

        self.init_gitignore(&gitignore_path)?;

        Ok(())
    }

    /// Load manifest from disk.  
    /// - If file missing: returns Err(io::ErrorKind::NotFound).  
    /// - If malformed: returns Err(io::ErrorKind::InvalidData).  
    /// - If partial: normalizes into full Manifest.  
    pub fn load(&mut self) -> io::Result<()> {
        let path = Config::manifest_path();

        let content = fs::read_to_string(path)?;
        let partial: PartialManifest = serde_json::from_str(&content)?;
        self.manifest = Manifest::merge(partial);
        Ok(())
    }

    /// Save the manifest to disk
    pub fn save(&self) -> io::Result<()> {
        let json = serde_json::to_string_pretty(&self.manifest)?;
        fs::write(Config::manifest_path(), json)?;
        Ok(())
    }

    fn normalize(&self, path: &Path) -> std::io::Result<()> {
        let io = use_io();

        let content = fs::read_to_string(path)?;
        let partial: PartialManifest = serde_json::from_str(&content)?;
        let manifest = Manifest::merge(partial);

        let json = serde_json::to_string_pretty(&manifest).unwrap();
        fs::write(path, json)?;
        io.info(&format!("Normalized existing {}", path.display()));
        Ok(())
    }

    fn init_gitignore(&self, path: &Path) -> std::io::Result<()> {
        let gitignore_path = Config::manifest_path();
        let io = use_io();

        if !path.exists() {
            let mut file = fs::File::create(path)?;
            for entry in RECOMMENDED_IGNORES {
                writeln!(file, "{}", entry)?;
            }
            io.success(&format!(
                "Created {} with recommended entries",
                gitignore_path.display()
            ));
        } else {
            io.warn(&format!(
                "{} already exists, recommended entries you may want to include:",
                gitignore_path.display()
            ));
            for entry in RECOMMENDED_IGNORES {
                println!("   {}", entry);
            }
        }

        Ok(())
    }
}
