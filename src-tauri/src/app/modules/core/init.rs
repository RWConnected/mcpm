use crate::app::modules::{io::use_io, manifest::ManifestService};
pub struct Init;

impl Init {
    pub async fn run() {
        let io = use_io();
        let service = ManifestService::new();

        if let Err(e) = service.init() {
            io.error("Initialization failed", Some(&e));
            return;
        }

        io.success("Initialization complete.");
    }
}
