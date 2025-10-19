use crate::app::modules::{
    core::{install::Install, upgrade::Upgrade},
    io::use_io,
};
use clap::Args;

#[derive(Args)]
pub struct UpgradeCommand {
    /// Mods to upgrade (id, slug or substring). If empty, upgrades all.
    pub mods: Vec<String>,

    #[arg(long)]
    pub no_cache: bool,

    #[arg(long)]
    pub force_rehash: bool,
}

impl UpgradeCommand {
    pub async fn handle(&self) {
        let io = use_io();

        match Upgrade::run(&self.mods).await {
            Ok(result) => {
                if result.upgraded.is_empty() {
                    io.info("All selected mods are already up to date");
                    return;
                }

                for (key, before, after) in result.upgraded {
                    io.success(&format!(
                        "Upgraded {}: {} → {}",
                        key,
                        before.unwrap_or_else(|| "-".into()),
                        after.unwrap_or_else(|| "-".into())
                    ));
                }

                if result.unchanged > 0 {
                    io.info(&format!(
                        "{} mod(s) were already up to date",
                        result.unchanged
                    ));
                }

                if let Err(e) = Install::run(self.no_cache, self.force_rehash).await {
                    io.error(&format!("Installation failed after upgrade: {}", e), None);
                    return;
                }

                io.success("All upgraded mods installed successfully.");
            }
            Err(msg) => io.error(&msg, None),
        }
    }
}
