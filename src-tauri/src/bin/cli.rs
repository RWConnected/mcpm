use clap::{CommandFactory, Parser};
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
        mode: IOMode::Cli,
    };
    init_io(io_cfg).await;

    unsafe {
        set_interactive(true);
    }

    if let Some(cmd) = cli.command {
        cmd.run().await;
    } else {
        let mut cmd = Cli::command();
        println!("mcpm {}", cmd.get_version().unwrap_or("unknown"));
        cmd.print_help().unwrap();
        println!();
    }
}
