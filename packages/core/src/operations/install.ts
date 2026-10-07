// Install operation ported from src-tauri/src/app/modules/core/install.rs

import {copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync} from "fs";
import {join} from "path";
import type {ModManager} from "./mod-manager.js";
import {loadersForKind, modEntryToKey, type ResourceKind} from "../models/manifest.js";
import {type LockEntry, lockResourceMap} from "../models/lockfile.js";
import type {HashFn} from "../helpers/hash.js";
import {unbundlePacks} from "../helpers/pack-bundle.js";

const RESOURCE_KINDS = ["mod", "datapack", "resourcepack", "shaderpack"] as const;

function dirFor(manager: ModManager, kind: ResourceKind): string {
  switch (kind) {
    case "datapack": return manager.config.datapacksDir;
    case "resourcepack": return manager.config.resourcepacksDir;
    case "shaderpack": return manager.config.shaderpacksDir;
    default: return manager.config.modsDir;
  }
}

export class Install {
  static async runWithManager(
    manager: ModManager,
    noCache: boolean,
    forceRehash: boolean,
  ): Promise<void> {
    // 1. Refresh all manifest entries (update lock), disabled ones included
    for (const kind of RESOURCE_KINDS) {
      for (const entry of manager.manifestEntries(kind)) {
        await manager.refreshMod(entry, undefined, false, false, kind);
      }
    }

    // 2. Prune lock (remove unreferenced)
    manager.lockService.prune(manager.manifestService.manifest);

    // 3. Save manifest + lock
    manager.saveAll();

    for (const kind of RESOURCE_KINDS) {
      const extension = kind === "mod" ? "jar" : "zip";
      await Install.installResource(manager, kind, dirFor(manager, kind), extension, noCache, forceRehash);
    }
  }

  private static async installResource(
    manager: ModManager,
    kind: ResourceKind,
    dir: string,
    extension: string,
    noCache: boolean,
    forceRehash: boolean,
  ): Promise<void> {
    const entries = manager.manifestEntries(kind);
    const disabledKeys = new Set(entries.filter((m) => m.disabled).map((m) => modEntryToKey(m)));
    const lockMap = lockResourceMap(manager.lockService.lock, kind);

    const cacheDir = manager.config.cacheDir;
    mkdirSync(cacheDir, { recursive: true });
    mkdirSync(dir, { recursive: true });

    const loaders = loadersForKind(manager.manifestService.manifest, kind);
    const providerOf = (key: string) => key.slice(0, key.indexOf(":"));
    const hashOf = (key: string) => (bytes: Uint8Array) => manager.repoService.contentHash(providerOf(key), bytes);
    // Cache is shared across projects and keyed by hash, so a re-resolved entry whose content
    // changed under the same version (e.g. on-demand built zips) never collides with a stale file.
    const cachePathFor = (key: string, entry: LockEntry) =>
      join(cacheDir, `${key}-${entry.version}-${entry.hash.slice(0, 16)}.${extension}`);

    // Hash-verify existing files (unless force-rehash)
    if (!forceRehash) {
      for (const [key, entry] of lockMap) {
        if (disabledKeys.has(key)) continue;
        const targetPath = join(dir, `${key}-${entry.version}.${extension}`);
        if (existsSync(targetPath) && !(await verifyFileHash(targetPath, entry.hash, hashOf(key)))) {
          throw new Error(
            `Hash mismatch for ${key}. Re-run with --force-rehash to continue.`,
          );
        }

        const cachePath = cachePathFor(key, entry);
        if (existsSync(cachePath) && !(await verifyFileHash(cachePath, entry.hash, hashOf(key)))) {
          unlinkSync(cachePath);
        }
      }
    }

    // Download files
    const expectedFiles: string[] = [];

    for (const [key, entry] of lockMap) {
      if (disabledKeys.has(key)) continue;
      const targetPath = join(dir, `${key}-${entry.version}.${extension}`);
      const cachePath = cachePathFor(key, entry);

      const dest = noCache ? targetPath : cachePath;
      if (!existsSync(dest) || forceRehash) {
        manager.io.info(`Downloading ${key} ${entry.version}`);
        const providerId = providerOf(key);
        const url = await manager.repoService.resolveDownloadUrl(providerId, entry, loaders);
        const headers = manager.repoService.getDownloadHeaders(providerId, url);
        await manager.downloadService.download(url, dest, entry.hash, headers, hashOf(key));
      }

      // Bundles are unpacked into one file per inner pack; the bundle itself is never installed
      // (with noCache it was downloaded to targetPath, which the cleanup below then removes).
      const bundled = kind === "datapack" || kind === "resourcepack"
        ? await unbundlePacks(readFileSync(dest))
        : undefined;
      if (bundled) {
        for (const pack of bundled) {
          const packPath = join(dir, `${key}-${entry.version}-${pack.name}`);
          writeFileSync(packPath, pack.bytes);
          expectedFiles.push(packPath);
        }
        continue;
      }

      expectedFiles.push(targetPath);
      if (!noCache) {
        copyFileSync(cachePath, targetPath);
      }
    }

    // Remove outdated files
    const dirents = readdirSync(dir, { withFileTypes: true });
    for (const dirent of dirents) {
      if (dirent.isFile()) {
        const fullPath = join(dir, dirent.name);
        if (!expectedFiles.includes(fullPath)) {
          unlinkSync(fullPath);
        }
      }
    }
  }
}

async function verifyFileHash(path: string, expected: string, hashFn: HashFn): Promise<boolean> {
  return (await hashFn(readFileSync(path))) === expected;
}
