use crate::app::modules::{core::remove::Remove, io::use_io, manifest::models::Provider};
use clap::Args;

#[derive(Args)]
pub struct RemoveCommand {
    pub slug: String,
    pub provider: Option<Provider>,
}

impl RemoveCommand {
    pub async fn handle(&self) {
        let io = use_io();

        match Remove::run(self.slug.clone(), self.provider.clone()).await {
            Ok(None) => io.success(&format!("Removed mod '{}' and updated lockfile", self.slug)),
            Ok(Some(w)) => io.warn(&w),
            Err(e) => io.error(&e, None),
        }
    }
}
