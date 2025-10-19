pub mod cli;
pub mod gui;
pub mod traits;

use std::sync::Arc;

use crate::app::modules::io::{
    cli::CliIO,
    traits::IO,
    traits::{IOConfig, IOMode},
};
use once_cell::sync::OnceCell;

pub type IOInstance = Arc<dyn IO + Send + Sync>;
static IO: OnceCell<IOInstance> = OnceCell::new();

pub async fn init_io(cfg: IOConfig) {
    let io: IOInstance = match cfg.mode {
        IOMode::Cli => Arc::new(CliIO::new(cfg)),
        IOMode::Gui => Arc::new(CliIO::new(cfg)), // placeholder until GuiIO
    };
    IO.set(io).ok();
}

pub fn use_io() -> IOInstance {
    IO.get().expect("IOService not initialized").clone()
}
