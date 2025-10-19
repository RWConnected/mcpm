use clap::Args;

use crate::app::modules::core::init::Init;

#[derive(Args)]
pub struct InitCommand;

impl InitCommand {
    pub async fn handle(&self) {
        Init::run().await;
    }
}
