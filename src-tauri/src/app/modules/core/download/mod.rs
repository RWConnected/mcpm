use sha2::{Digest, Sha512};

mod downloader;
mod http;

#[cfg(test)]
mod fake;

pub use downloader::DownloadService;
pub use http::HttpDownloadService;

#[cfg(test)]
pub use fake::FakeDownloadService;

fn validate_hash(bytes: &dyn AsRef<[u8]>, expected_hash: &str) -> bool {
    let mut hasher = Sha512::new();
    hasher.update(&bytes);
    let hash = format!("{:x}", hasher.finalize());
    hash == expected_hash
}