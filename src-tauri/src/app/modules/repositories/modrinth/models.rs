#![allow(dead_code)]

use serde::Deserialize;

#[derive(Deserialize)]
pub struct SearchResponse {
    pub hits: Vec<SearchItem>,
}

#[derive(Debug, Deserialize)]
pub struct FindResponse {
    pub id: String,
    pub slug: String,
    pub title: String,
    pub description: String,
    pub client_side: String,
    pub server_side: String,
    pub game_versions: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct SearchItem {
    pub author: String,
    pub categories: Vec<String>,
    pub client_side: String,
    pub color: Option<u32>,
    pub date_created: String,
    pub date_modified: String,
    pub description: String,
    pub display_categories: Vec<String>,
    pub downloads: u64,
    pub featured_gallery: Option<String>,
    pub follows: u64,
    pub gallery: Vec<String>,
    pub icon_url: Option<String>,
    pub latest_version: String,
    pub license: String,
    pub project_id: String,
    pub project_type: String,
    pub server_side: String,
    pub slug: String,
    pub title: String,
    pub versions: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct VersionItem {
    pub id: String,
    pub project_id: String,
    pub author_id: String,
    pub date_published: String,
    pub version_number: String,
    pub game_versions: Vec<String>,
    pub loaders: Vec<String>,
    pub files: Vec<VersionFile>,
    pub changelog: Option<String>,
    pub dependencies: Vec<VersionDependency>,
    pub status: String,
    pub requested_status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct VersionFile {
    pub url: String,
    pub filename: String,
    pub primary: bool,
    pub size: u64,
    pub hashes: std::collections::HashMap<String, String>,
}

#[derive(Debug, Deserialize)]
pub struct VersionDependency {
    pub project_id: Option<String>,
    pub version_id: Option<String>,
    pub dependency_type: String, // e.g. "required"
}
