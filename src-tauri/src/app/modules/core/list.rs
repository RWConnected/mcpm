use crate::app::modules::core::ops::manager::ModManager;
use crate::app::modules::io::use_io;
use clap::Args;

#[derive(Args)]
pub struct List {}

impl List {
    pub async fn run() -> Result<(), String> {
        let io = use_io();

        let mut manager = ModManager::load()
            .await
            .map_err(|e| format!("Failed to initialize ModManager: {}", e))?;

        let mods = manager.manifest.mods_as_entries();

        if mods.is_empty() {
            io.info("No mods installed.");
            return Ok(());
        }

        io.info("Installed mods:");

        for entry in mods {
            io.print(&format!(
                " - {}:{} ({})",
                entry.provider.to_string().to_lowercase(),
                entry.slug,
                entry.version.as_str()
            ));
        }

        Ok(())
    }
}
