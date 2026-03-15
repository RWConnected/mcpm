// LockService ported from src-tauri/src/app/modules/lock/services.rs

import { readFileSync, writeFileSync, existsSync } from "fs";
import type { ConfigPaths } from "../models/config.js";
import type { IO } from "../io/io.types.js";
import type { LockFile, LockEntry } from "../models/lockfile.js";
import type { Manifest, ModEntry, VersionSpec } from "../models/manifest.js";
import type { VersionResult } from "../models/repository.js";
import type { RepositoryService } from "../repositories/repository-service.js";
import { modEntryToKey, versionSpecToString } from "../models/manifest.js";
import { emptyLockFile } from "../models/lockfile.js";
import { asStr } from "../helpers/utils.js";
import { satisfies, resolveVersion, compareVersions } from "../helpers/semver.js";

export class LockService {
  lock: LockFile;

  constructor(
    private readonly paths: ConfigPaths,
    private readonly io: IO,
  ) {
    this.lock = emptyLockFile();
  }

  /** Load lockfile from disk. Returns empty lockfile if file missing or invalid. */
  load(): void {
    if (!existsSync(this.paths.lockPath)) {
      this.lock = emptyLockFile();
      return;
    }
    try {
      const content = readFileSync(this.paths.lockPath, "utf-8");
      const raw = JSON.parse(content);
      const mods = new Map<string, LockEntry>();
      if (raw.mods && typeof raw.mods === "object") {
        for (const [key, value] of Object.entries(raw.mods)) {
          mods.set(key, value as LockEntry);
        }
      }
      this.lock = { mods };
    } catch {
      this.lock = emptyLockFile();
    }
  }

  /** Save lockfile to disk, sorting mods alphabetically by key */
  save(): void {
    const sortedKeys = [...this.lock.mods.keys()].sort();
    const sortedMods: Record<string, LockEntry> = {};
    for (const key of sortedKeys) {
      sortedMods[key] = this.lock.mods.get(key)!;
    }
    const json = JSON.stringify({ mods: sortedMods }, null, 2);
    writeFileSync(this.paths.lockPath, json);
  }

  /** Update a lock entry for a manifest mod. Returns true on success. */
  async updateEntry(
    manifestMod: ModEntry,
    manifest: Manifest,
    repoService: RepositoryService,
    available?: VersionResult[],
    upgrade = false,
    ignoreConstraints = false,
  ): Promise<boolean> {
    const key = modEntryToKey(manifestMod);
    const prev = this.lock.mods.get(key);

    const versionOutdated = prev
      ? !satisfies(manifestMod.version, prev.version)
      : true;

    const projectId = prev ? prev.id : manifestMod.slug;

    if (!upgrade && !versionOutdated) {
      return true;
    }

    const versions: VersionResult[] = available
      ? [...available]
      : await repoService.getVersions(
          projectId,
          [manifest.minecraft_version],
          [asStr(manifest.modloader)],
        );

    if (versions.length === 0) {
      this.io.error(`No compatible versions found for '${manifestMod.slug}'`);
      return false;
    }

    let resolved: VersionResult | undefined;

    if (ignoreConstraints) {
      // Pick highest version
      resolved = versions.reduce((best, v) =>
        compareVersions(v.version, best.version) > 0 ? v : best,
      );
    } else if (manifestMod.version.kind === "exact") {
      resolved = versions.find((v) => v.version === manifestMod.version.value);
    } else {
      resolved = resolveVersion(manifestMod.version.value, versions);
    }

    if (resolved) {
      this.lock.mods.set(key, {
        id: resolved.modId,
        version: resolved.version,
        minecraft_versions: resolved.minecraftVersions,
        url: resolved.url,
        hash: resolved.hash,
      });

      if (upgrade) {
        const currentSpec = manifest.mods.get(key);
        if (currentSpec) {
          const newSpec: VersionSpec = currentSpec.kind === "exact"
            ? { kind: "exact", value: resolved.version }
            : { kind: "range", value: `^${resolved.version}` };
          manifest.mods.set(key, newSpec);
        }
      }
    } else {
      this.io.error(
        `Failed to resolve '${manifestMod.slug}' with version spec '${versionSpecToString(manifestMod.version)}'`,
      );
    }

    return true;
  }

  /** Remove lock entries not present in manifest. Returns set of removed keys. */
  prune(manifest: Manifest): Set<string> {
    const manifestKeys = new Set(manifest.mods.keys());
    const removed = new Set<string>();

    for (const key of this.lock.mods.keys()) {
      if (!manifestKeys.has(key)) {
        this.lock.mods.delete(key);
        removed.add(key);
      }
    }

    return removed;
  }

  /** Get the resolved version for a manifest mod entry */
  getVersion(manifestMod: ModEntry): string | undefined {
    const key = modEntryToKey(manifestMod);
    return this.lock.mods.get(key)?.version;
  }
}
