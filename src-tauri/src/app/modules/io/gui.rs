use std::error::Error;

use crate::app::modules::io::traits::PromptResult;

use super::traits::{IOConfig, Input, Output};
use async_trait::async_trait;

pub struct GuiIO {
    cfg: IOConfig,
}
impl GuiIO {
    pub fn new(cfg: IOConfig) -> Self {
        Self { cfg }
    }
}

#[async_trait]
impl Output for GuiIO {
    fn debug(&self, msg: &str) {
        if self.cfg.verbose {
            println!("{:<8}{msg}", "[DEBUG]");
        }
    }
    fn print(&self, msg: &str) {
        println!("{:<8}{msg}", "");
    }
    fn info(&self, msg: &str) {
        println!("{:<8}{msg}", "[INFO]");
    }
    fn success(&self, msg: &str) {
        println!("{:<8}{msg}", "[OK]");
    }
    fn warn(&self, msg: &str) {
        eprintln!("{:<8}{msg}", "[WARN]");
    }
    fn error(&self, msg: &str, err: Option<&dyn Error>) {
        match err {
            Some(e) => eprintln!("{:<8}{msg}: {e}", "[ERR]"),
            None => eprintln!("{:<8}{msg}", "[ERR]"),
        }
    }
}

#[async_trait]
impl Input for GuiIO {
    async fn prompt(&self, _message: &str, default: Option<String>) -> PromptResult<String> {
        // TODO: Implement GUI modal prompt
        match default {
            Some(v) => PromptResult::Response(v),
            None => PromptResult::Cancel,
        }
    }
    async fn confirm(&self, _message: &str, default: bool) -> PromptResult<bool> {
        PromptResult::Response(default)
    }

    // TODO: Implement warn and error prompts when needed
    // async fn modal_warn(&self, m: &str) {
    //     eprintln!("[WARN MODAL] {m}");
    // }
    // async fn modal_error(&self, m: &str, err: Option<&dyn Error>) {
    //     eprintln!("[ERROR MODAL] {m}");
    // }
}
