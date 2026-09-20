// LockService ported from src-tauri/src/app/modules/lock/services.rs

import {existsSync, readFileSync, writeFileSync} from "fs";
import type {ConfigPaths} from "../models/config.js";
import type {IO} from "../io/io.types.js";
import type {LockEntry, LockFile} from "../models/lockfile.js";
import {emptyLockFile} from "../models/lockfile.js";
import type {Manifest, ModEntry, ResourceKind, VersionSpec} from "../models/manifest.js";
import {
  manifestKeyForEntry,
  modEntryToKey,
  modsAsEntries,
  resourceMap,
  versionSpecToString
} from "../models/manifest.js";
import type {VersionResult} from "../models/repository.js";
import type {RepositoryService} from "../repositories/repository-service.js";
import {asStr} from "../helpers/utils.js";
import {compareVersions, resolveVersion, satisfies} from "../helpers/semver.js";

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
      const datapacks = new Map<string, LockEntry>();
      if (raw.datapacks && typeof raw.datapacks === "object") {
        for (const [key, value] of Object.entries(raw.datapacks)) {
          datapacks.set(key, value as LockEntry);
        }
      }
      this.lock = { mods, datapacks };
    } catch {
      this.lock = emptyLockFile();
    }
  }

  /** Save lockfile to disk, sorting each list alphabetically by key */
  save(): void {
    const json = JSON.stringify(
      { mods: sortedRecord(this.lock.mods), datapacks: sortedRecord(this.lock.datapacks) },
      null,
      2,
    );
    writeFileSync(this.paths.lockPath, json);
  }

  /** Update a lock entry for a manifest mod/datapack. Returns true on success. */
  async updateEntry(
    manifestMod: ModEntry,
    manifest: Manifest,
    repoService: RepositoryService,
    available?: VersionResult[],
    upgrade = false,
    ignoreConstraints = false,
    kind: ResourceKind = "mod",
  ): Promise<boolean> {
    const key = modEntryToKey(manifestMod);
    const lockMap = kind === "datapack" ? this.lock.datapacks : this.lock.mods;
    const prev = lockMap.get(key);

    const versionOutdated = prev
      ? !satisfies(manifestMod.version, prev.version)
      : true;

    const projectId = `${manifestMod.provider}:${prev ? prev.id : manifestMod.slug}`;

    if (!upgrade && !versionOutdated) {
      return true;
    }

    const wantedVersion = manifestMod.version.kind === "exact" ? manifestMod.version.value : undefined;

    const versions: VersionResult[] = available
      ? [...available]
      : await repoService.getVersions(
          projectId,
          [manifest.minecraft_version],
          kind === "datapack" ? ["datapack"] : [asStr(manifest.modloader)],
          wantedVersion,
        );

    if (versions.length === 0) {
      const message = `No compatible versions found for '${manifestMod.slug}'`;
      if (manifestMod.disabled) {
        this.io.info(message);
      } else {
        this.io.error(message);
      }
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
      lockMap.set(key, {
        id: resolved.modId,
        version: resolved.version,
        minecraft_versions: resolved.minecraftVersions,
        url: resolved.url,
        hash: resolved.hash,
      });

      if (upgrade) {
        const manifestKey = manifestKeyForEntry(manifestMod);
        const manifestMap = resourceMap(manifest, kind);
        const currentSpec = manifestMap.get(manifestKey);
        if (currentSpec) {
          const newSpec: VersionSpec = currentSpec.kind === "exact"
            ? { kind: "exact", value: resolved.version }
            : { kind: "range", value: `^${resolved.version}` };
          manifestMap.set(manifestKey, newSpec);
        }
      }
    } else {
      this.io.error(
        `Failed to resolve '${manifestMod.slug}' with version spec '${versionSpecToString(manifestMod.version)}'`,
      );
    }

    return true;
  }

  /** Remove lock entries not present in the manifest. Returns set of removed keys (mods + datapacks). */
  prune(manifest: Manifest): Set<string> {
    const removed = new Set<string>();
    for (const kind of ["mod", "datapack"] as const) {
      const manifestKeys = new Set(modsAsEntries(manifest, kind).map((e) => modEntryToKey(e)));
      const lockMap = kind === "datapack" ? this.lock.datapacks : this.lock.mods;
      for (const key of lockMap.keys()) {
        if (!manifestKeys.has(key)) {
          lockMap.delete(key);
          removed.add(key);
        }
      }
    }
    return removed;
  }

  /** Get the resolved version for a manifest mod/datapack entry */
  getVersion(manifestMod: ModEntry, kind: ResourceKind = "mod"): string | undefined {
    const key = modEntryToKey(manifestMod);
    const lockMap = kind === "datapack" ? this.lock.datapacks : this.lock.mods;
    return lockMap.get(key)?.version;
  }
}

function sortedRecord(map: Map<string, LockEntry>): Record<string, LockEntry> {
  const sorted: Record<string, LockEntry> = {};
  for (const key of [...map.keys()].sort()) {
    sorted[key] = map.get(key)!;
  }
  return sorted;
}
