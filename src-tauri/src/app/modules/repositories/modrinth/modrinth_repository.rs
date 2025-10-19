use super::super::interfaces::IRepository;
use super::super::models::ModResult;
use super::models::SearchResponse;
use crate::app::{
    modules::{
        manifest::models::Side,
        repositories::{
            models::VersionResult,
            modrinth::models::{FindResponse, VersionItem},
        },
    },
    PAGINATION_SIZE,
};
use async_trait::async_trait;
use reqwest::Client;

pub struct ModrinthRepository {
    client: Client,
}

impl ModrinthRepository {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
        }
    }
}

#[async_trait]
impl IRepository for ModrinthRepository {
    async fn search(&self, query: &str, page: usize) -> Vec<ModResult> {
        let url =
            format!("https://api.modrinth.com/v2/search?query={query}") + &with_pagination(page);

        // Send request
        let res = match self.client.get(&url).send().await {
            Ok(r) => r,
            Err(_) => return vec![],
        };

        // Parse JSON
        let parsed: SearchResponse = match res.json().await {
            Ok(p) => p,
            Err(_) => return vec![],
        };

        parsed
            .hits
            .into_iter()
            .map(|hit| ModResult {
                id: hit.project_id.clone(),
                slug: hit.slug.clone(),
                name: hit.title,
                description: hit.description,
                source: "Modrinth".into(),
                side: get_side(&hit.client_side, &hit.server_side),
                url: format!("https://modrinth.com/mod/{}", hit.slug.clone()),
            })
            .collect()
    }

    async fn find(&self, slug: &str) -> Option<ModResult> {
        let url = format!("https://api.modrinth.com/v2/project/{slug}");

        // Send request
        let res = match self.client.get(&url).send().await {
            Ok(r) => r,
            Err(_) => return None,
        };

        // Parse JSON
        let response: FindResponse = match res.json().await {
            Ok(p) => p,
            Err(_) => return None,
        };

        return Some(ModResult {
            id: response.id.clone(),
            slug: response.slug.clone(),
            name: response.title,
            description: response.description,
            source: "Modrinth".into(),
            side: get_side(&response.client_side, &response.server_side),
            url: format!("https://modrinth.com/mod/{}", response.slug.clone()),
        });
    }

    async fn get_versions(
        &self,
        project_id: &str,
        game_versions: &[String],
        loaders: &[String],
    ) -> Vec<VersionResult> {
        let url = format!(
            "https://api.modrinth.com/v2/project/{}/version?game_versions={}&loaders={}",
            project_id,
            serde_json::to_string(game_versions).unwrap(),
            serde_json::to_string(loaders).unwrap(),
        );

        let res = match self.client.get(&url).send().await {
            Ok(r) => r,
            Err(_) => return vec![],
        };

        let parsed: Vec<VersionItem> = match res.json().await {
            Ok(p) => p,
            Err(_) => return vec![],
        };

        parsed
            .into_iter()
            .map(|v: VersionItem| VersionResult {
                mod_id: v.project_id,
                version: v.version_number,
                minecraft_versions: v.game_versions,
                url: v
                    .files
                    .iter()
                    .find(|f| f.primary)
                    .map(|f| f.url.clone())
                    .unwrap_or_default(),
                hash: v
                    .files
                    .iter()
                    .find(|f| f.primary)
                    .and_then(|f| f.hashes.get("sha512").cloned())
                    .or_else(|| {
                        v.files
                            .iter()
                            .find(|f| f.primary)
                            .and_then(|f| f.hashes.get("sha1").cloned())
                    })
                    .unwrap_or("".to_string()),
            })
            .collect()
    }
}

fn get_side(client: &str, server: &str) -> Side {
    let client_supported = matches!(client, "required" | "optional");
    let server_supported = matches!(server, "required" | "optional");

    match (client_supported, server_supported) {
        (true, true) => Side::Both,
        (true, false) => Side::Client,
        (false, true) => Side::Server,
        _ => Side::Unknown,
    }
}

fn with_pagination(page: usize) -> String {
    let offset: usize = page * PAGINATION_SIZE;
    format!("&offset={offset}&limit={PAGINATION_SIZE}")
}
