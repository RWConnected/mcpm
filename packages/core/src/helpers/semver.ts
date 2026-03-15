// Semver resolution ported from src-tauri/src/app/helpers/semver.rs
// 3-tier fallback: raw semver → normalized semver → exact match

import semver from "semver";
import type { VersionSpec } from "../models/manifest.js";
import type { VersionResult } from "../models/repository.js";

export { isSemverRange } from "../models/manifest.js";

/**
 * Resolve a version spec against available versions.
 * Tries 3 strategies in order: semver, normalized semver, exact match.
 */
export function resolveVersion(range: string, available: VersionResult[]): VersionResult | undefined {
  return (
    resolveWithSemver(range, available) ??
    resolveWithNormalized(range, available) ??
    resolveWithExact(range, available)
  );
}

/** Check if a version satisfies a VersionSpec */
export function satisfies(spec: VersionSpec, version: string): boolean {
  if (spec.kind === "exact") {
    return spec.value === version;
  }
  // For range, try resolving the single version against the range
  const dummy: VersionResult = {
    modId: "",
    version,
    minecraftVersions: [],
    url: "",
    hash: "",
  };
  return resolveWithSemver(spec.value, [dummy]) !== undefined;
}

/** Compare two version strings. Returns <0, 0, or >0. */
export function compareVersions(a: string, b: string): number {
  const na = normalizeVersion(a);
  const nb = normalizeVersion(b);
  const va = semver.valid(semver.coerce(na));
  const vb = semver.valid(semver.coerce(nb));

  if (va && vb) return semver.compare(va, vb);
  if (va && !vb) return 1; // valid > invalid
  if (!va && vb) return -1;
  return a < b ? -1 : a > b ? 1 : 0; // fallback: lexicographic
}

/**
 * Strip leading non-digit characters from a version string.
 * Example: "mc1.21.1-0.6.5-fabric" → "1.21.1-0.6.5-fabric"
 *
 * Note: The Rust implementation strips everything until the first digit,
 * which for "mc1.21.1-0.6.5-fabric" gives "1.21.1-0.6.5-fabric" (starting at '1').
 */
function normalizeVersion(s: string): string {
  let i = 0;
  while (i < s.length && !/\d/.test(s[i])) {
    i++;
  }
  return s.slice(i);
}

/**
 * Normalize a semver string by keeping prefix chars (^, ~, >, <, =)
 * and ensuring exactly 3 numeric parts.
 */
function normalizeSemverString(s: string): string {
  // Keep prefix characters
  let prefixEnd = 0;
  for (let i = 0; i < s.length; i++) {
    if (/\d/.test(s[i])) {
      prefixEnd = i;
      break;
    }
    prefixEnd = i + 1;
  }

  const prefix = s.slice(0, prefixEnd);
  const core = s.slice(prefixEnd);
  const parts = core.split(".");

  if (parts.length > 3) {
    parts.length = 3; // truncate
  } else {
    while (parts.length < 3) {
      parts.push("0");
    }
  }

  return prefix + parts.join(".");
}

/** Try resolving with raw semver (tier 1) */
function resolveWithSemver(range: string, available: VersionResult[]): VersionResult | undefined {
  const normalizedRange = normalizeSemverString(range);
  const req = semver.validRange(normalizedRange);
  if (!req) return undefined;

  const parsed: Array<{ sv: string; original: VersionResult }> = [];
  for (const v of available) {
    const fixed = normalizeSemverString(v.version);
    const sv = semver.valid(semver.coerce(fixed));
    if (sv) {
      parsed.push({ sv, original: v });
    }
  }

  // Sort descending (highest first)
  parsed.sort((a, b) => semver.rcompare(a.sv, b.sv));

  // Find first that satisfies the range
  const match = parsed.find((p) => semver.satisfies(p.sv, req));
  return match?.original;
}

/** Try resolving with normalized versions (tier 2) */
function resolveWithNormalized(range: string, available: VersionResult[]): VersionResult | undefined {
  const normalizedRange = normalizeVersion(range);

  // Create normalized copies of available versions but keep original references
  const normalizedAvailable: VersionResult[] = available.map((v) => ({
    ...v,
    version: normalizeVersion(v.version),
  }));

  const result = resolveWithSemver(normalizedRange, normalizedAvailable);
  if (!result) return undefined;

  // Find the original (un-normalized) version that corresponds to this result
  // Match by URL since it's unique per version
  return available.find((v) => v.url === result.url) ?? result;
}

/** Fallback: try exact match without range operators (tier 3) */
function resolveWithExact(range: string, available: VersionResult[]): VersionResult | undefined {
  const clean = range.replace(/^[\^~><=*]+/, "");
  return available.find((v) => v.version === clean);
}
