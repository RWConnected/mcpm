pub mod cli;
pub mod semver;
pub mod test_utils;

use serde::Serialize;

pub fn as_str<T: Serialize>(value: &T) -> String {
    serde_json::to_string(value)
        .unwrap_or_default()
        .trim_matches('"')
        .to_string()
}
