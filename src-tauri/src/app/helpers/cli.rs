use crate::app::is_interactive;
use dialoguer::Select;

// TODO: Move these functions to the IO module

/// Generic "pick with pagination"
/// - `fetch_page` is an async function that loads a new page given an offset.
/// - Returns `None` if user cancels.
pub async fn pick_with_pagination<T, F, Fut, S>(
    mut fetch_page: F,
    prompt: &str,
    format: S,
) -> Option<T>
where
    T: Clone,
    F: FnMut(usize) -> Fut,
    Fut: std::future::Future<Output = Vec<T>>,
    S: Fn(&T) -> String,
{
    if !is_interactive() {
        // fallback: just load first page and pick first item
        let page = fetch_page(0).await;
        return page.into_iter().next();
    }

    let mut page = 0;
    let mut items: Vec<T> = Vec::new();
    let mut last_selected = 0;

    loop {
        // Load one more page
        let new_items = fetch_page(page).await;
        if new_items.is_empty() {
            // no more data
            return None;
        }
        items.extend(new_items);
        page += 1;

        // Prepare menu
        let mut menu: Vec<String> = items.iter().map(|x| format(x)).collect();
        menu.push("Load more…".into());

        let selection = Select::new()
            .with_prompt(prompt)
            .items(&menu)
            .default(last_selected)
            .interact()
            .unwrap();

        if selection == menu.len() - 1 {
            // "Load more…" picked
            last_selected = selection;
            continue;
        }

        return Some(items[selection].clone());
    }
}

pub fn pick<T, F>(items: &[T], prompt: &str, format: F) -> Option<T>
where
    T: Clone,
    F: Fn(&T) -> String,
{
    if items.is_empty() {
        return None;
    }

    if !is_interactive() {
        return Some(items[0].clone()); // fallback: pick first
    }

    let menu: Vec<String> = items.iter().map(|x| format(x)).collect();

    let selection = Select::new()
        .with_prompt(prompt)
        .items(&menu)
        .default(0)
        .interact()
        .unwrap();

    Some(items[selection].clone())
}
