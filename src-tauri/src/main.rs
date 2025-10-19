// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use clap::Parser;
use mcpm_lib::app::{
    commands::Cli,
    modules::io::{
        init_io,
        traits::{IOConfig, IOMode},
    },
    set_interactive, Config,
};

#[tokio::main]
async fn main() {
    let cli = Cli::parse();

    Config::init(&cli);

    let io_cfg = IOConfig {
        verbose: cli.verbose,
        quiet: cli.quiet,
        mode: match cli.has_command() {
            true => IOMode::Cli,
            false => IOMode::Gui,
        },
    };
    init_io(io_cfg).await;

    if cli.has_command() {
        unsafe {
            set_interactive(true);
        }
        if let Some(cmd) = cli.command {
            cmd.run().await;
        }
        return;
    }

    mcpm_lib::run()
}
