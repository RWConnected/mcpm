// Prevents additional console window on Windows in release with gui feature enabled
#![cfg_attr(
    all(not(debug_assertions), feature = "gui"),
    windows_subsystem = "windows"
)]

#[cfg(not(feature = "gui"))]
use clap::CommandFactory;

use clap::Parser;
use mcpm_lib::app::{
    commands::Cli,
    modules::io::{init_io, traits::IOConfig},
    set_interactive, Config,
};

#[tokio::main]
async fn main() {
    let cli = Cli::parse();
    Config::init(&cli);

    let io_cfg = IOConfig {
        verbose: cli.verbose,
        quiet: cli.quiet,
    };
    init_io(io_cfg).await;

    unsafe { set_interactive(io_cfg.verbose || io_cfg.quiet) }

    #[cfg(feature = "gui")]
    {
        mcpm_lib::run();
    }
    #[cfg(not(feature = "gui"))]
    {
        if let Some(cmd) = cli.command {
            cmd.run().await;
        } else {
            let mut cmd = Cli::command();
            println!("mcpm {}", cmd.get_version().unwrap_or("unknown"));
            cmd.print_help().unwrap();
            println!();
        }
    }
}
