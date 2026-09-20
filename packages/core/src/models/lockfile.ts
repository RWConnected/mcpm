// Models ported from src-tauri/src/app/modules/lock/models.rs

import type {ResourceKind} from "./manifest.js";

export interface LockEntry {
  readonly id: string;
  readonly version: string;
  readonly minecraft_versions: string[];
  readonly url: string;
  readonly hash: string;
}

export interface LockFile {
  mods: Map<string, LockEntry>;
  datapacks: Map<string, LockEntry>;
  resourcepacks: Map<string, LockEntry>;
  shaderpacks: Map<string, LockEntry>;
}

export function emptyLockFile(): LockFile {
  return { mods: new Map(), datapacks: new Map(), resourcepacks: new Map(), shaderpacks: new Map() };
}

/** Returns the lockfile map for the given resource kind. */
export function lockResourceMap(lock: LockFile, kind: ResourceKind = "mod"): Map<string, LockEntry> {
  switch (kind) {
    case "datapack": return lock.datapacks;
    case "resourcepack": return lock.resourcepacks;
    case "shaderpack": return lock.shaderpacks;
    default: return lock.mods;
  }
}
