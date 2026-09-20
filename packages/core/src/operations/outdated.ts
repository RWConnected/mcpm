import type {ModManager} from "./mod-manager.js";
import type {ModEntry, ResourceKind} from "../models/manifest.js";
import {loadersForKind, modEntryToKey} from "../models/manifest.js";
import {lockResourceMap} from "../models/lockfile.js";
import {resolveVersion} from "../helpers/semver.js";

export interface OutdatedEntry {
  key: string;
  kind: ResourceKind;
  current: string;
  wanted?: string;
  latest?: string;
  disabled?: boolean;
}

export interface OutdatedResult {
  outdated: OutdatedEntry[];
  totalChecked: number;
}

export class Outdated {
  static async run(
    manager: ModManager,
    mods: string[],
  ): Promise<OutdatedResult> {
    const allEntries = (["mod", "datapack", "resourcepack", "shaderpack"] as const).flatMap((kind) =>
      manager.manifestEntries(kind).map((entry) => ({ entry, kind })),
    );
    const toCheck = mods.length === 0
      ? allEntries
      : allEntries.filter(({ entry }) => mods.some((q) => entry.slug.includes(q)));

    if (toCheck.length === 0) {
      throw new Error("No matching mods found to check for updates");
    }

    const result: OutdatedResult = {
      outdated: [],
      totalChecked: toCheck.length,
    };

    // Check each mod/datapack concurrently
    const checks = toCheck.map(({ entry, kind }) => Outdated.checkMod(manager, entry, kind));
    const entries = await Promise.all(checks);

    for (const entry of entries) {
      if (entry) result.outdated.push(entry);
    }

    result.outdated.sort((a, b) => a.key.localeCompare(b.key));
    return result;
  }

  private static async checkMod(
    manager: ModManager,
    m: ModEntry,
    kind: ResourceKind,
  ): Promise<OutdatedEntry | undefined> {
    const key = modEntryToKey(m);
    const lockEntry = lockResourceMap(manager.lockService.lock, kind).get(key);
    if (!lockEntry) return undefined;

    const versions = await manager.repoService.getVersions(
      key,
      [manager.manifestService.manifest.minecraft_version],
      loadersForKind(manager.manifestService.manifest, kind),
    );
    if (versions.length === 0) return undefined;

    const latest = versions[0]?.version;
    const wanted = m.version.kind === "range"
      ? resolveVersion(m.version.value, versions)?.version
      : lockEntry.version;

    const current = lockEntry.version;
    if ((wanted && wanted !== current) || (latest && latest !== current)) {
      return { key, kind, current, wanted, latest, disabled: m.disabled };
    }
    return undefined;
  }
}
