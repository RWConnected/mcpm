// Models ported from src-tauri/src/app/modules/manifest/models.rs

import type {ProviderConfig} from "./provider-config.js";

export type Side = "client" | "server" | "both" | "unknown";

export type ModLoader = "forge" | "fabric" | "quilt" | "neoforge";

export type Provider = string;

/** Which manifest/lock list an entry belongs to. */
export type ResourceKind = "mod" | "datapack";

export type VersionSpec =
  | { readonly kind: "exact"; readonly value: string }
  | { readonly kind: "range"; readonly value: string };

export interface ModEntry {
  readonly slug: string;
  readonly version: VersionSpec;
  readonly provider: Provider;
  readonly disabled?: boolean;
}

export interface Manifest {
  name: string;
  version: string;
  description?: string;
  author?: string;
  side: Side;
  modloader: ModLoader;
  minecraft_version: string;
  default_provider: Provider;
  mods: Map<string, VersionSpec>;
  datapacks: Map<string, VersionSpec>;
  license?: string;
  homepage?: string;
  tags?: string[];
  providers?: ProviderConfig[];
}

export interface PartialManifest {
  name?: string;
  version?: string;
  description?: string;
  author?: string;
  side?: Side;
  modloader?: ModLoader;
  minecraft_version?: string;
  default_provider?: Provider;
  mods?: Map<string, VersionSpec>;
  datapacks?: Map<string, VersionSpec>;
  license?: string;
  homepage?: string;
  tags?: string[];
  providers?: ProviderConfig[];
}

/** Matches Rust's is_semver_range: checks if first char is ^, ~, >, <, or * */
export function isSemverRange(s: string): boolean {
  if (s.length === 0) return false;
  const first = s[0];
  return first === "^" || first === "~" || first === ">" || first === "<" || first === "*";
}

/** Parse a version string into a VersionSpec, matching Rust's Deserialize impl */
export function versionSpecFromString(s: string): VersionSpec {
  if (isSemverRange(s)) {
    return { kind: "range", value: s };
  }
  return { kind: "exact", value: s };
}

export function versionSpecToString(spec: VersionSpec): string {
  return spec.value;
}

export function defaultManifest(): Manifest {
  return {
    name: "My Modpack",
    version: "1.0.0",
    description: "A Minecraft modpack",
    side: "both",
    modloader: "fabric",
    minecraft_version: "1.21.7",
    default_provider: "modrinth",
    mods: new Map(),
    datapacks: new Map(),
  };
}

/** Merge a partial manifest with defaults (like Rust's Manifest::merge) */
export function mergeManifest(partial: PartialManifest): Manifest {
  const defaults = defaultManifest();
  return {
    name: partial.name ?? defaults.name,
    version: partial.version ?? defaults.version,
    description: partial.description ?? defaults.description,
    author: partial.author ?? defaults.author,
    side: partial.side ?? defaults.side,
    modloader: partial.modloader ?? defaults.modloader,
    minecraft_version: partial.minecraft_version ?? defaults.minecraft_version,
    default_provider: partial.default_provider ?? defaults.default_provider,
    mods: partial.mods ?? new Map(),
    datapacks: partial.datapacks ?? new Map(),
    license: partial.license ?? defaults.license,
    homepage: partial.homepage ?? defaults.homepage,
    tags: partial.tags ?? defaults.tags,
    providers: partial.providers ?? defaults.providers,
  };
}

/** Provider ids that cannot be used for a custom provider config. */
export const RESERVED_PROVIDER_IDS = new Set<string>(["disabled", "modrinth", "curseforge", "github", "maven"]);

/** Prefix used on a manifest mod key to mark it as temporarily disabled. */
export const DISABLED_PREFIX = "disabled:";

/** All known provider ids: built-in "modrinth" plus every configured provider id (valid or not). */
export function knownProviderIds(manifest: Manifest): Set<string> {
  const ids = new Set<string>(["modrinth"]);
  for (const p of manifest.providers ?? []) ids.add(p.id);
  return ids;
}

/** Returns the manifest map for the given resource kind ("mod" -> mods, "datapack" -> datapacks). */
export function resourceMap(manifest: Manifest, kind: ResourceKind = "mod"): Map<string, VersionSpec> {
  return kind === "datapack" ? manifest.datapacks : manifest.mods;
}

/** Convert a manifest resource map to a ModEntry array (like Rust's Manifest::mods_as_entries) */
export function modsAsEntries(manifest: Manifest, kind: ResourceKind = "mod"): ModEntry[] {
  const knownProviders = knownProviderIds(manifest);
  const entries: ModEntry[] = [];
  for (const [rawKey, version] of resourceMap(manifest, kind)) {
    const disabled = rawKey.startsWith(DISABLED_PREFIX);
    const key = disabled ? rawKey.slice(DISABLED_PREFIX.length) : rawKey;

    const colonIdx = key.indexOf(":");
    const providerStr = colonIdx >= 0 ? key.slice(0, colonIdx) : "";
    const slug = colonIdx >= 0 ? key.slice(colonIdx + 1) : key;

    const provider: Provider = knownProviders.has(providerStr) ? providerStr : manifest.default_provider;

    entries.push(disabled ? { slug, version, provider, disabled } : { slug, version, provider });
  }
  return entries;
}

/** Format a ModEntry as "provider:slug" (like Rust's ModEntry::to_key). Always canonical/unprefixed. */
export function modEntryToKey(entry: ModEntry): string {
  return `${entry.provider}:${entry.slug}`;
}

/** Format a ModEntry as the key that should be stored in Manifest.mods, including the disabled prefix. */
export function manifestKeyForEntry(entry: ModEntry): string {
  const key = modEntryToKey(entry);
  return entry.disabled ? `${DISABLED_PREFIX}${key}` : key;
}

/** Insert a mod/datapack entry into the manifest (like Rust's Manifest::insert_mod_entry) */
export function insertModEntry(manifest: Manifest, entry: ModEntry, kind: ResourceKind = "mod"): void {
  const key = manifestKeyForEntry(entry);
  resourceMap(manifest, kind).set(key, entry.version);
}

/** Disable an entry in place (moves it under the disabled prefix). No-op if already disabled or missing. */
export function disableModEntry(manifest: Manifest, entry: ModEntry, kind: ResourceKind = "mod"): boolean {
  if (entry.disabled) return false;
  const key = modEntryToKey(entry);
  const map = resourceMap(manifest, kind);
  const version = map.get(key);
  if (version === undefined) return false;
  map.delete(key);
  map.set(`${DISABLED_PREFIX}${key}`, version);
  return true;
}

/** Enable an entry in place (moves it out of the disabled prefix). No-op if already enabled or missing. */
export function enableModEntry(manifest: Manifest, entry: ModEntry, kind: ResourceKind = "mod"): boolean {
  if (!entry.disabled) return false;
  const key = modEntryToKey(entry);
  const disabledKey = `${DISABLED_PREFIX}${key}`;
  const map = resourceMap(manifest, kind);
  const version = map.get(disabledKey);
  if (version === undefined) return false;
  map.delete(disabledKey);
  map.set(key, version);
  return true;
}

/** Remove an entry by provider and slug, returns true if removed (like Rust's Manifest::remove_mod_entry) */
export function removeModEntry(
  manifest: Manifest,
  provider: string,
  slug: string,
  kind: ResourceKind = "mod",
): boolean {
  const key = `${provider}:${slug}`;
  const disabledKey = `${DISABLED_PREFIX}${key}`;
  const map = resourceMap(manifest, kind);
  const removed = map.delete(key);
  const removedDisabled = map.delete(disabledKey);
  return removed || removedDisabled;
}
