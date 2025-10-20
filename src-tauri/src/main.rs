// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(not(feature = "gui"))]
use clap::CommandFactory;

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

    // Determine mode based on features and CLI input
    let mode = resolve_mode(&cli);

    let io_cfg = IOConfig {
        verbose: cli.verbose,
        quiet: cli.quiet,
        mode,
    };
    init_io(io_cfg).await;

    unsafe { set_interactive(true) }

    if let Some(cmd) = cli.command {
        cmd.run().await;
    } else {
        #[cfg(feature = "gui")]
        {
            mcpm_lib::run();
        }

        #[cfg(not(feature = "gui"))]
        {
            let mut cmd = Cli::command();
            println!("mcpm {}", cmd.get_version().unwrap_or("unknown"));
            cmd.print_help().unwrap();
            println!();
        }
    }
}

fn resolve_mode(cli: &Cli) -> IOMode {
    #[cfg(feature = "gui")]
    {
        if cli.has_command() {
            IOMode::Cli
        } else {
            IOMode::Gui
        }
    }

    #[cfg(not(feature = "gui"))]
    {
        IOMode::Cli
    }
}
