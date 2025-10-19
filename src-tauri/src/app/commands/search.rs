use crate::app::modules::core::search::Search;
use clap::Args;

#[derive(Args)]
pub struct SearchCommand {
    pub query: String,
    #[arg(long)]
    pub page: Option<usize>,
}

impl SearchCommand {
    pub async fn handle(&self) {
        Search::run(self.query.clone(), self.page.clone()).await
    }
}
