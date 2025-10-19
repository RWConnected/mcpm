use clap::Args;

use crate::app::modules::core::list::List;

#[derive(Args)]
pub struct ListCommand {}

impl ListCommand {
    pub fn handle(&self) {
        List::run();
    }
}
