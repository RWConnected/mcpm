use crate::app::modules::manifest::models::Side;

#[derive(Debug, Clone, serde::Serialize)]
pub struct ModResult {
    pub id: String,
    pub slug: String,
    pub name: String,
    pub description: String,
    pub source: String,
    pub side: Side,
    pub url: String,
}

#[derive(Debug, Clone)]
pub struct VersionResult {
    pub mod_id: String,
    pub version: String,                 // e.g. "15.2.1"
    pub minecraft_versions: Vec<String>, // ["1.21.7", "1.21.6"]
    pub url: String,                     // direct download or project version page
    pub hash: String,
}
