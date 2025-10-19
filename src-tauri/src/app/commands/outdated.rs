use crate::app::modules::{
    core::outdated::{Outdated, OutdatedResult},
    io::{use_io, IOInstance},
};
use clap::Args;

#[derive(Args)]
pub struct OutdatedCommand {
    /// Mods to check (id, slug or substring). If empty, checks all.
    pub mods: Vec<String>,
}

impl OutdatedCommand {
    pub async fn handle(&self) {
        let io = use_io();

        match Outdated::run(self.mods.clone()).await {
            Ok(result) => Self::print_result(&io, result),
            Err(msg) => io.error(&msg, None),
        }
    }

    fn print_result(io: &IOInstance, result: OutdatedResult) {
        if result.outdated.is_empty() {
            io.success("All mods are up to date");
            return;
        }

        io.info(&format!(
            "Found {} outdated mod(s):\n",
            result.outdated.len()
        ));
        println!(
            "| {:<30} | {:<20} | {:<20} | {:<20} |",
            "Mod", "Current", "Wanted", "Latest"
        );
        println!("{}", "-".repeat(103));

        for entry in result.outdated {
            println!(
                "| {:<30} | {:<20} | {:<20} | {:<20} |",
                entry.key,
                entry.current,
                entry.wanted.unwrap_or("-".into()),
                entry.latest.unwrap_or("-".into()),
            );
        }

        println!("\nChecked {} mods total", result.total_checked);
    }
}
