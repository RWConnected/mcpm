// Upgrade operation ported from src-tauri/src/app/modules/core/upgrade.rs

import type {ModManager} from "./mod-manager.js";
import {disableModEntry, modEntryToKey} from "../models/manifest.js";

export interface UpgradeResult {
  upgraded: Array<[string, string | undefined, string | undefined]>; // [key, before, after]
  unchanged: number;
  disabled: string[]; // keys disabled because no compatible version was found
}

export class Upgrade {
  static async runWithManager(
    manager: ModManager,
    mods: string[],
    ignoreConstraints: boolean,
    disableUnresolved = false,
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
      const key = modEntryToKey(entry);
      const v = manager.lockService.getVersion(entry);
      if (v) beforeVersions.set(key, v);
    }

    // Refresh each mod with upgrade=true
    const disabled: string[] = [];
    for (const entry of toUpgrade) {
      const success = await manager.lockService.updateEntry(
        entry,
        manager.manifestService.manifest,
        manager.repoService,
        undefined,
        true,
        ignoreConstraints,
      );

      if (!success) {
        if (!disableUnresolved) {
          throw new Error(`Failed to update ${entry.slug}`);
        }
        if (disableModEntry(manager.manifestService.manifest, entry)) {
          disabled.push(modEntryToKey(entry));
        }
      }
    }

    manager.saveAll();

    // Compare snapshots
    const upgraded: Array<[string, string | undefined, string | undefined]> = [];
    const disabledKeys = new Set(disabled);
    let unchanged = 0;

    for (const entry of toUpgrade) {
      const key = modEntryToKey(entry);
      if (disabledKeys.has(key)) continue;

      const before = beforeVersions.get(key);
      const after = manager.lockService.getVersion(entry);

      if (before !== after) {
        upgraded.push([key, before, after]);
      } else {
        unchanged++;
      }
    }

    return { upgraded, unchanged, disabled };
  }
}
