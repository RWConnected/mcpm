pub mod models;
pub mod modrinth;
// later: pub mod curseforge;
// later: pub mod github;
// later: pub mod maven;

mod interfaces;
mod services;

pub use services::RepositoryService;
