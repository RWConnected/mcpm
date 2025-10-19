use clap::Args;

#[derive(Args)]
pub struct List {}

impl List {
    pub fn run() {
        println!("Listing installed mods...");
        // TODO: real list logic here
    }
}
