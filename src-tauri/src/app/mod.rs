pub mod commands;
mod config;
pub mod helpers;
pub mod modules;

pub use config::Config;

pub static mut INTERACTIVE: bool = false;
pub const PAGINATION_SIZE: usize = 20;

// Safe getter
pub fn is_interactive() -> bool {
    unsafe { INTERACTIVE }
}

// Unsafe setter (set once at startup)
pub unsafe fn set_interactive(value: bool) {
    INTERACTIVE = value;
}
