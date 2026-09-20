// Install operation ported from src-tauri/src/app/modules/core/install.rs

import {copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync} from "fs";
import {join} from "path";
import {createHash} from "crypto";
import type {ModManager} from "./mod-manager.js";
import {modEntryToKey, type ResourceKind} from "../models/manifest.js";
import {lockResourceMap} from "../models/lockfile.js";

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

    // Hash-verify existing files (unless force-rehash)
    if (!forceRehash) {
      for (const [key, entry] of lockMap) {
        if (disabledKeys.has(key)) continue;
        const fileName = `${key}-${entry.version}.${extension}`;
        const targetPath = join(dir, fileName);
        const cachePath = join(cacheDir, fileName);

        for (const p of [targetPath, cachePath]) {
          if (existsSync(p) && !verifyFileHash(p, entry.hash)) {
            throw new Error(
              `Hash mismatch for ${key}. Re-run with --force-rehash to continue.`,
            );
          }
        }
      }
    }

    // Download files
    const expectedFiles: string[] = [];

    for (const [key, entry] of lockMap) {
      if (disabledKeys.has(key)) continue;
      const fileName = `${key}-${entry.version}.${extension}`;
      const targetPath = join(dir, fileName);
      const cachePath = join(cacheDir, fileName);
      expectedFiles.push(targetPath);

      const dest = noCache ? targetPath : cachePath;
      if (!existsSync(dest) || forceRehash) {
        manager.io.info(`Downloading ${key} ${entry.version}`);
        const providerId = key.slice(0, key.indexOf(":"));
        const headers = manager.repoService.getDownloadHeaders(providerId, entry.url);
        await manager.downloadService.download(entry.url, dest, entry.hash, headers);
      }

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

function verifyFileHash(path: string, expected: string): boolean {
  const bytes = readFileSync(path);
  const actual = createHash("sha512").update(bytes).digest("hex");
  return actual === expected;
}
