use async_trait::async_trait;
use colored::*;
use dialoguer::{Confirm, Input as DInput};
use std::{
    error::Error,
    io::{stdin, stdout, IsTerminal},
};

use crate::app::modules::io::traits::PromptResult;

use super::traits::{IOConfig, Input, Output};

pub struct CliIO {
    cfg: IOConfig,
}
impl CliIO {
    pub fn new(cfg: IOConfig) -> Self {
        Self { cfg }
    }

    fn interactive(&self) -> bool {
        return !self.cfg.quiet && stdin().is_terminal() && stdout().is_terminal();
    }
}

#[async_trait]
impl Output for CliIO {
    fn debug(&self, msg: &str) {
        if self.cfg.verbose {
            println!("{} {}", "[DEBUG]".purple().bold(), msg);
        }
    }
    fn info(&self, msg: &str) {
        if !self.cfg.quiet {
            println!("{} {}", "[INFO]".blue().bold(), msg);
        }
    }
    fn success(&self, msg: &str) {
        if !self.cfg.quiet {
            println!("{} {}", "[OK]".green().bold(), msg);
        }
    }
    fn warn(&self, msg: &str) {
        eprintln!("{} {}", "[WARNING]".yellow().bold(), msg);
    }
    fn error(&self, msg: &str, err: Option<&dyn Error>) {
        let prefix = "[ERROR]".red().bold();
        match err {
            Some(e) => eprintln!("{} {}: {}", prefix, msg, e),
            None => eprintln!("{} {}", prefix, msg),
        }
    }
}

#[async_trait]
impl Input for CliIO {
    async fn prompt(&self, message: &str, default: Option<String>) -> PromptResult<String> {
        if !self.interactive() {
            return match default {
                Some(v) => PromptResult::Response(v),
                None => PromptResult::Cancel,
            };
        }

        let input = DInput::<String>::new().with_prompt(message);

        // if let Some(ref d) = default { // TODO: Consider this later
        //     input.default(d.to_string());
        // }

        match input.interact_text() {
            Ok(v) => PromptResult::Response(v),
            Err(_) => PromptResult::Cancel,
        }
    }
    async fn confirm(&self, message: &str, default: bool) -> PromptResult<bool> {
        if !self.interactive() {
            return PromptResult::Response(default);
        }

        match Confirm::new().with_prompt(message).interact() {
            Ok(v) => PromptResult::Response(v),
            Err(_) => PromptResult::Cancel,
        }
    }

    // TODO: Implement warn and error prompts when needed
    // async fn modal_warn(&self, m: &str) {
    //     eprintln!("{} {}", "[WARN]".yellow().bold(), m);
    // }
    // async fn modal_error(&self, m: &str, err: Option<&dyn Error>) {
    //     eprintln!("{} {}", "[ERR]".red().bold(), m);
    // }
}
