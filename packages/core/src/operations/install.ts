// Install operation ported from src-tauri/src/app/modules/core/install.rs

import {copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync} from "fs";
import {join} from "path";
import {createHash} from "crypto";
import type {ModManager} from "./mod-manager.js";
import {modEntryToKey, type ResourceKind} from "../models/manifest.js";

export class Install {
  static async runWithManager(
    manager: ModManager,
    noCache: boolean,
    forceRehash: boolean,
  ): Promise<void> {
    // 1. Refresh all manifest mods + datapacks (update lock), disabled ones included
    for (const kind of ["mod", "datapack"] as const) {
      for (const entry of manager.manifestEntries(kind)) {
        await manager.refreshMod(entry, undefined, false, false, kind);
      }
    }

    // 2. Prune lock (remove unreferenced)
    manager.lockService.prune(manager.manifestService.manifest);

    // 3. Save manifest + lock
    manager.saveAll();

    await Install.installResource(manager, "mod", manager.config.modsDir, "jar", noCache, forceRehash);
    await Install.installResource(manager, "datapack", manager.config.datapacksDir, "zip", noCache, forceRehash);
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
    const lockMap = kind === "datapack" ? manager.lockService.lock.datapacks : manager.lockService.lock.mods;

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
