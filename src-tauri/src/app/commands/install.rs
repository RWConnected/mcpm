// commands/install.rs
use crate::app::modules::{core::install::Install, io::use_io};
use clap::Args;

#[derive(Args)]
pub struct InstallCommand {
    #[arg(long)]
    pub no_cache: bool,

    #[arg(long)]
    pub force_rehash: bool,
}

impl InstallCommand {
    pub async fn handle(&self) {
        let io = use_io();

        match Install::run(self.no_cache, self.force_rehash).await {
            Ok(_) => io.success("Installation completed successfully"),
            Err(e) => io.error(&e, None),
        }
    }
}
