// Add operation ported from src-tauri/src/app/modules/core/add.rs

import type { ModManager } from "./mod-manager.js";
import type { Provider, VersionSpec } from "../models/manifest.js";
import type { VersionResult } from "../models/repository.js";
import { isSemverRange, insertModEntry } from "../models/manifest.js";
import { asStr } from "../helpers/utils.js";

export interface AddOptions {
  id: string;
  version?: string;
  provider?: Provider;
  exact: boolean;
  /** Callback to select a mod from search results. If not provided, uses first result. */
  searchPicker?: (results: { name: string; url: string; source: string }[]) => Promise<number>;
  /** Callback to select a version. If not provided, uses first version. */
  versionPicker?: (versions: VersionResult[]) => Promise<number>;
  search: boolean;
}

export class Add {
  static async run(manager: ModManager, options: AddOptions): Promise<void> {
    await manager.load();

    const provider = options.provider ?? manager.manifestService.manifest.default_provider;

    // Find the project
    let project;
    if (options.search) {
      const results = await manager.repoService.search(options.id, 0);
      if (results.length === 0) {
        throw new Error(`No mod found for '${options.id}'`);
      }
      const idx = options.searchPicker ? await options.searchPicker(results) : 0;
      project = results[idx];
    } else {
      project = await manager.repoService.find(options.id);
      if (!project) {
        throw new Error(`No mod found for '${options.id}'`);
      }
    }

    // Get compatible versions
    const versions = await manager.repoService.getVersions(
      project.id,
      [manager.manifestService.manifest.minecraft_version],
      [asStr(manager.manifestService.manifest.modloader)],
    );

    if (versions.length === 0) {
      throw new Error(
        `No compatible versions found for '${project.name}' with Minecraft ${manager.manifestService.manifest.minecraft_version}`,
      );
    }

    // Pick version
    let chosen: VersionResult;
    if (options.version) {
      const found = versions.find((v) => v.version === options.version);
      if (found) {
        chosen = found;
      } else if (options.versionPicker) {
        const idx = await options.versionPicker(versions);
        chosen = versions[idx];
      } else {
        chosen = versions[0];
      }
    } else {
      chosen = versions[0];
    }

    // Determine version spec
    const versionSpec = resolveVersionSpec(options.version, chosen.version, options.exact);

    const entry = {
      slug: project.slug,
      version: versionSpec,
      provider,
    };

    insertModEntry(manager.manifestService.manifest, entry);

    await manager.refreshMod(entry, versions, false, false);
    manager.saveAll();
  }
}

function resolveVersionSpec(
  requested: string | undefined,
  chosen: string,
  exact: boolean,
): VersionSpec {
  if (requested && isSemverRange(requested)) {
    return { kind: "range", value: requested };
  }
  if (exact) {
    return { kind: "exact", value: chosen };
  }
  return { kind: "range", value: `^${chosen}` };
}
