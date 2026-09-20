// Install operation ported from src-tauri/src/app/modules/core/install.rs

import {copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync} from "fs";
import {join} from "path";
import {createHash} from "crypto";
import type {ModManager} from "./mod-manager.js";
import {modEntryToKey} from "../models/manifest.js";

export class Install {
  static async runWithManager(
    manager: ModManager,
    noCache: boolean,
    forceRehash: boolean,
  ): Promise<void> {
    const mods = manager.manifestModEntries();
    const disabledKeys = new Set(
      mods.filter((m) => m.disabled).map((m) => modEntryToKey(m)),
    );

    // 1. Refresh all manifest mods (update lock), disabled ones included
    for (const entry of mods) {
      await manager.refreshMod(entry, undefined, false, false);
    }

    // 2. Prune lock (remove unreferenced)
    manager.lockService.prune(manager.manifestService.manifest);

    // 3. Save manifest + lock
    manager.saveAll();

    const cacheDir = manager.config.cacheDir;
    const modsDir = manager.config.modsDir;
    mkdirSync(cacheDir, { recursive: true });
    mkdirSync(modsDir, { recursive: true });

    // 4. Hash-verify existing mods (unless force-rehash)
    if (!forceRehash) {
      for (const [key, entry] of manager.lockService.lock.mods) {
        if (disabledKeys.has(key)) continue;
        const fileName = `${key}-${entry.version}.jar`;
        const modPath = join(modsDir, fileName);
        const cachePath = join(cacheDir, fileName);

        for (const p of [modPath, cachePath]) {
          if (existsSync(p) && !verifyFileHash(p, entry.hash)) {
            throw new Error(
              `Hash mismatch for ${key}. Re-run with --force-rehash to continue.`,
            );
          }
        }
      }
    }

    // 5. Download mods
    const expectedModFiles: string[] = [];

    for (const [key, entry] of manager.lockService.lock.mods) {
      if (disabledKeys.has(key)) continue;
      const fileName = `${key}-${entry.version}.jar`;
      const targetPath = join(modsDir, fileName);
      const cachePath = join(cacheDir, fileName);
      expectedModFiles.push(targetPath);

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

    // 6. Remove outdated mod files
    const entries = readdirSync(modsDir, { withFileTypes: true });
    for (const dirent of entries) {
      if (dirent.isFile()) {
        const fullPath = join(modsDir, dirent.name);
        if (!expectedModFiles.includes(fullPath)) {
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
