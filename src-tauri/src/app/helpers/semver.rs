use crate::app::modules::{manifest::models::VersionSpec, repositories::models::VersionResult};
use semver::{Version, VersionReq};

pub fn is_semver_range(s: &str) -> bool {
    matches!(s.chars().next(), Some('^' | '~' | '>' | '<' | '*'))
}

pub fn resolve_version(range: &str, available: &[VersionResult]) -> Option<VersionResult> {
    resolve_with_semver(range, available)
        .or_else(|| resolve_with_normalized(range, available))
        .or_else(|| resolve_with_exact(range, available))
}

pub fn satisfies(spec: &VersionSpec, version: &str) -> bool {
    match spec {
        VersionSpec::Exact(v) => v == version,
        VersionSpec::Range(r) => resolve_with_semver(
            r,
            &[VersionResult {
                mod_id: String::new(),
                version: version.to_string(),
                minecraft_versions: vec![],
                url: String::new(),
                hash: String::new(),
            }],
        )
        .is_some(),
    }
}

/// Normalize a version string by stripping leading non-numeric characters
/// Example: "mc1.21.1-0.6.5-fabric" → "0.6.5-fabric"
fn normalize_version(s: &str) -> String {
    let mut chars = s.chars();
    let mut result = String::new();
    let mut found_digit = false;

    while let Some(c) = chars.next() {
        if !found_digit && !c.is_ascii_digit() {
            continue;
        }
        found_digit = true;
        result.push(c);
    }

    result
}

fn normalize_semver_string(s: &str) -> String {
    // keep prefix characters (~,^,>,<,=) if present
    let mut prefix = String::new();
    let mut core_start = 0;
    for (i, c) in s.char_indices() {
        if c.is_ascii_digit() {
            core_start = i;
            break;
        }
        prefix.push(c);
    }

    let core = &s[core_start..];
    let mut parts: Vec<&str> = core.split('.').collect();

    if parts.len() > 3 {
        parts.truncate(3); // drop extra build digits
    } else if parts.len() < 3 {
        while parts.len() < 3 {
            parts.push("0");
        }
    }

    format!("{}{}", prefix, parts.join("."))
}

/// Try resolving with raw semver
fn resolve_with_semver(range: &str, available: &[VersionResult]) -> Option<VersionResult> {
    let normalized = normalize_semver_string(range);
    let req = VersionReq::parse(&normalized).ok()?;
    let mut parsed: Vec<_> = available
        .iter()
        .filter_map(|v| {
            let fixed = normalize_semver_string(&v.version);
            Version::parse(&fixed).ok().map(|sv| (sv, v.clone()))
        })
        .collect();
    parsed.sort_by(|a, b| b.0.cmp(&a.0));
    parsed
        .into_iter()
        .find(|(sv, _)| req.matches(sv))
        .map(|(_, v)| v)
}

/// Try resolving with normalized semver
fn resolve_with_normalized(range: &str, available: &[VersionResult]) -> Option<VersionResult> {
    let r_norm = normalize_version(range);

    let available_norm: Vec<VersionResult> = available
        .iter()
        .map(|v| {
            let mut clone = v.clone();
            clone.version = normalize_version(&clone.version);
            clone
        })
        .collect();

    resolve_with_semver(&r_norm, &available_norm)
}

/// Fallback: try exact match without range operators
fn resolve_with_exact(range: &str, available: &[VersionResult]) -> Option<VersionResult> {
    let clean = range.trim_start_matches(|c: char| "^~><=*".contains(c));
    available.iter().find(|v| v.version == clean).cloned()
}
