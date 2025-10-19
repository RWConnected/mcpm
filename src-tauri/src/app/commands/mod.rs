pub mod add;
pub mod init;
pub mod install;
pub mod list;
pub mod outdated;
pub mod remove;
pub mod search;
pub mod upgrade;

use clap::{ArgGroup, Parser, Subcommand};

#[derive(Parser)]
#[command(
    name = "mcpm",
    version,
    about = "Minecraft Package Manager for mods, resources and more.",
    group(
        ArgGroup::new("verbosity")
            .args(&["quiet", "verbose"])
            .multiple(false)
    )
)]
pub struct Cli {
    /// Enable verbose output
    #[arg(short, long, global = true)]
    pub verbose: bool,

    /// Suppress all non-error output
    #[arg(short, long, global = true)]
    pub quiet: bool,

    /// Cache directory. (env: MCPM_CACHE_DIR, default: ~/.mcpm/cache)
    #[arg(long, global = true)]
    pub cache_dir: Option<String>,

    /// Output directory. (env: MCPM_OUTPUT_DIR, default: ./)
    #[arg(long, global = true)]
    pub output_dir: Option<String>,

    /// Mods directory (absolute or relative to --output-dir) (env: MCPM_MODS_DIR, default: mods)
    #[arg(long, global = true)]
    pub mods_dir: Option<String>,

    #[command(subcommand)]
    pub command: Option<Commands>,
}

impl Cli {
    /// Returns true if a subcommand was provided
    pub fn has_command(&self) -> bool {
        self.command.is_some()
    }
}

#[derive(Subcommand)]
pub enum Commands {
    Init(init::InitCommand),
    Add(add::AddCommand),
    Remove(remove::RemoveCommand),
    Install(install::InstallCommand),
    Upgrade(upgrade::UpgradeCommand),
    Outdated(outdated::OutdatedCommand),
    List(list::ListCommand),
    Search(search::SearchCommand),
}

impl Commands {
    pub async fn run(self) {
        match self {
            Commands::Init(cmd) => cmd.handle().await,
            Commands::Install(cmd) => cmd.handle().await,
            Commands::Upgrade(cmd) => cmd.handle().await,
            Commands::Outdated(cmd) => cmd.handle().await,
            Commands::List(cmd) => cmd.handle(),
            Commands::Search(cmd) => cmd.handle().await,
            Commands::Add(cmd) => cmd.handle().await,
            Commands::Remove(cmd) => cmd.handle().await,
        }
    }
}
