use serde_json::Value;
use std::fs;
use std::io;
use std::io::Write;
use std::path::Path;

use crate::app::modules::io::use_io;
use crate::app::modules::manifest::models::{Manifest, PartialManifest};

const MANIFEST_FILE: &str = "mcpm.json";
const GITIGNORE_FILE: &str = ".gitignore";
const RECOMMENDED_IGNORES: [&str; 4] = ["mods/", "crash-reports/", "logs/", "saves/"];

pub struct ManifestService;

impl ManifestService {
    pub fn new() -> Self {
        Self
    }

    /// Initialize a manifest (create or normalize) and handle .gitignore
    pub fn init(&self) -> std::io::Result<()> {
        let manifest_path = Path::new(MANIFEST_FILE);
        let gitignore_path = Path::new(GITIGNORE_FILE);

        if !manifest_path.exists() {
            self.create()?;
        } else {
            self.normalize(manifest_path)?;
        }

        self.init_gitignore(gitignore_path)?;

        Ok(())
    }

    /// Load manifest from disk.  
    /// - If file missing: returns Err(io::ErrorKind::NotFound).  
    /// - If malformed: returns Err(io::ErrorKind::InvalidData).  
    /// - If partial: normalizes into full Manifest.  
    pub fn load(&self) -> io::Result<Manifest> {
        let path = Path::new(MANIFEST_FILE);

        let content = fs::read_to_string(path)?;
        let value: Value = serde_json::from_str(&content)
            .map_err(|_| io::Error::new(io::ErrorKind::InvalidData, "Invalid JSON"))?;

        let partial = PartialManifest::from_value(value);
        Ok(Manifest::merge(partial))
    }

    /// Save the manifest to disk
    pub fn save(&self, manifest: &Manifest) -> std::io::Result<()> {
        let json = serde_json::to_string_pretty(manifest).unwrap();
        std::fs::write(MANIFEST_FILE, json)?;
        Ok(())
    }

    /// Create a new manifest with defaults
    pub fn create(&self) -> std::io::Result<()> {
        let io = use_io();

        let manifest = Manifest::default();
        self.save(&manifest)?;
        io.success(&format!("Created {}", MANIFEST_FILE));
        Ok(())
    }

    fn normalize(&self, path: &Path) -> std::io::Result<()> {
        let io = use_io();

        let content = fs::read_to_string(path)?;
        let value: serde_json::Value = serde_json::from_str(&content).unwrap_or_default();

        let partial = PartialManifest::from_value(value);
        let manifest = Manifest::merge(partial);

        let json = serde_json::to_string_pretty(&manifest).unwrap();
        fs::write(path, json)?;
        io.info(&format!("Normalized existing {}", MANIFEST_FILE));
        Ok(())
    }

    fn init_gitignore(&self, path: &Path) -> std::io::Result<()> {
        let io = use_io();

        if !path.exists() {
            let mut file = fs::File::create(path)?;
            for entry in RECOMMENDED_IGNORES {
                writeln!(file, "{}", entry)?;
            }
            io.success(&format!(
                "Created {} with recommended entries",
                GITIGNORE_FILE
            ));
        } else {
            io.warn(&format!(
                "{} already exists, recommended entries you may want to include:",
                GITIGNORE_FILE
            ));
            for entry in RECOMMENDED_IGNORES {
                println!("   {}", entry);
            }
        }

        Ok(())
    }
}
