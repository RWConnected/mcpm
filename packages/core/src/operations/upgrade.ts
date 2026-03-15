// Upgrade operation ported from src-tauri/src/app/modules/core/upgrade.rs

import type { ModManager } from "./mod-manager.js";

export interface UpgradeResult {
  upgraded: Array<[string, string | undefined, string | undefined]>; // [key, before, after]
  unchanged: number;
}

export class Upgrade {
  static async runWithManager(
    manager: ModManager,
    mods: string[],
    ignoreConstraints: boolean,
  ): Promise<UpgradeResult> {
    const allMods = manager.manifestModEntries();

    const toUpgrade = mods.length === 0
      ? allMods
      : allMods.filter((m) => mods.some((q) => m.slug.includes(q)));

    if (toUpgrade.length === 0) {
      throw new Error("No matching mods found to upgrade");
    }

    // Snapshot current versions
    const beforeVersions = new Map<string, string>();
    for (const entry of toUpgrade) {
      const key = `${entry.provider}:${entry.slug}`;
      const v = manager.lockService.getVersion(entry);
      if (v) beforeVersions.set(key, v);
    }

    // Refresh each mod with upgrade=true
    for (const entry of toUpgrade) {
      await manager.refreshMod(entry, undefined, true, ignoreConstraints);
    }

    manager.saveAll();

    // Compare snapshots
    const upgraded: Array<[string, string | undefined, string | undefined]> = [];
    let unchanged = 0;

    for (const entry of toUpgrade) {
      const key = `${entry.provider}:${entry.slug}`;
      const before = beforeVersions.get(key);
      const after = manager.lockService.getVersion(entry);

      if (before !== after) {
        upgraded.push([key, before, after]);
      } else {
        unchanged++;
      }
    }

    return { upgraded, unchanged };
  }
}
