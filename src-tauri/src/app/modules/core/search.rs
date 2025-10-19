use crate::app::modules::repositories::{modrinth::ModrinthRepository, RepositoryService};

pub struct Search;

impl Search {
    pub async fn run(query: String, page: Option<usize>) {
        let service =
            RepositoryService::new().with_provider("modrinth", Box::new(ModrinthRepository::new()));

        let results = service.search(&query, page.unwrap_or(0)).await;

        for r in results {
            println!("[{}] {} - {}", r.source, r.name, r.url);
        }
    }
}
