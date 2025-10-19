use std::error::Error;

use async_trait::async_trait;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum IOMode {
    Cli,
    Gui,
}

#[derive(Debug, Clone, Copy)]
pub struct IOConfig {
    pub verbose: bool,
    pub quiet: bool,
    pub mode: IOMode,
}

#[derive(Debug, Clone)]
pub enum PromptResult<T> {
    /// The user provided an explicit response.
    Response(T),

    /// The user chose to cancel the prompt (e.g. closed modal or pressed Esc).
    Cancel,
}

#[async_trait]
pub trait Output {
    fn debug(&self, msg: &str);
    fn info(&self, msg: &str);
    fn success(&self, msg: &str);
    fn warn(&self, msg: &str);
    fn error(&self, msg: &str, err: Option<&dyn Error>);
}

#[async_trait]
pub trait Input {
    async fn prompt(&self, question: &str, default: Option<String>) -> PromptResult<String>;
    async fn confirm(&self, question: &str, default: bool) -> PromptResult<bool>;

    // TODO: Implement warn and error prompts when needed
    // async fn modal_warn(&self, message: &str);
    // async fn modal_error(&self, message: &str, err: Option<&dyn Error>);
}

/// Combined trait for a single trait object
#[async_trait]
pub trait IO: Output + Input {}
impl<T: Output + Input + Send + Sync> IO for T {}

impl<T> PromptResult<T> {
    pub fn unwrap(self) -> T {
        match self {
            PromptResult::Response(v) => v,
            PromptResult::Cancel => panic!("Called unwrap() on cancelled prompt"),
        }
    }

    pub fn is_cancel(&self) -> bool {
        matches!(self, PromptResult::Cancel)
    }
}
