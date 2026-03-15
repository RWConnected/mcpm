// Models ported from src-tauri/src/app/modules/lock/models.rs

export interface LockEntry {
  readonly id: string;
  readonly version: string;
  readonly minecraft_versions: string[];
  readonly url: string;
  readonly hash: string;
}

export interface LockFile {
  mods: Map<string, LockEntry>;
}

export function emptyLockFile(): LockFile {
  return { mods: new Map() };
}
