use crate::app::modules::core::add::Add;
use crate::app::modules::io::use_io;
use crate::app::modules::manifest::models::Provider;
use clap::Args;

#[derive(Args)]
pub struct AddCommand {
    pub id: String,
    pub version: Option<String>,

    #[arg(long)]
    pub provider: Option<Provider>,

    #[arg(long)]
    pub exact: bool,

    #[arg(long)]
    pub search: bool,
}

impl AddCommand {
    pub async fn handle(&self) {
        let io = use_io();

        match Add::run(
            &self.id,
            self.version.clone(),
            self.provider.clone(),
            self.exact,
            self.search,
        )
        .await
        {
            Ok(_) => io.success("Mod added successfully"),
            Err(e) => io.error(&e, None),
        }
    }
}
