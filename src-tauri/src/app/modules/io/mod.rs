pub mod cli;
pub mod gui;
pub mod traits;

use std::sync::Arc;

use crate::app::modules::io::{cli::CliIO, traits::IOConfig, traits::IO};
use once_cell::sync::OnceCell;

pub type IOInstance = Arc<dyn IO + Send + Sync>;
static IO: OnceCell<IOInstance> = OnceCell::new();

#[cfg(not(feature = "gui"))]
pub async fn init_io(cfg: IOConfig) {
    let io: IOInstance = Arc::new(CliIO::new(cfg));
    IO.set(io).ok();
}

#[cfg(feature = "gui")]
pub async fn init_io(cfg: IOConfig) {
    // TODO: Replace with GUI-specific instance
    let io: IOInstance = Arc::new(CliIO::new(cfg));
    IO.set(io).ok();
}

pub fn use_io() -> IOInstance {
    IO.get().expect("IOService not initialized").clone()
}
