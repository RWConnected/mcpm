use clap::Args;

use crate::app::modules::core::list::List;

#[derive(Args)]
pub struct ListCommand {}

impl ListCommand {
    pub async fn handle(&self) {
        List::run().await.expect("Failed to list mods");
    }
}
