// Add operation ported from src-tauri/src/app/modules/core/add.rs

import type {ModManager} from "./mod-manager.js";
import type {Provider, ResourceKind, VersionSpec} from "../models/manifest.js";
import {insertModEntry, isSemverRange} from "../models/manifest.js";
import type {VersionResult} from "../models/repository.js";
import {asStr} from "../helpers/utils.js";

interface FoundProject {
  id: string;
  slug: string;
  name: string;
}

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
  kind?: ResourceKind;
}

export class Add {
  static async run(manager: ModManager, options: AddOptions): Promise<void> {
    await manager.load();

    const kind = options.kind ?? "mod";
    const provider = options.provider ?? manager.manifestService.manifest.default_provider;

    const project = options.search
      ? await Add.findViaSearch(manager, options)
      : await Add.findViaProviderOrSlug(manager, provider, options.id);

    // Get compatible versions
    const versions = await manager.repoService.getVersions(
      `${provider}:${project.id}`,
      [manager.manifestService.manifest.minecraft_version],
      kind === "datapack" ? ["datapack"] : [asStr(manager.manifestService.manifest.modloader)],
      options.version,
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

    insertModEntry(manager.manifestService.manifest, entry, kind);

    await manager.refreshMod(entry, versions, false, false, kind);
    manager.saveAll();
  }

  /** Fuzzy-searches the catalog for options.id and lets searchPicker choose among the results. */
  private static async findViaSearch(manager: ModManager, options: AddOptions): Promise<FoundProject> {
    const results = await manager.repoService.search(options.id, 0);
    if (results.length === 0) {
      throw new Error(`No mod found for '${options.id}'`);
    }
    const idx = options.searchPicker ? await options.searchPicker(results) : 0;
    return results[idx];
  }

  /** Resolves a single mod by exact slug: a real lookup if the provider supports discovery,
   * otherwise trusts id as the slug outright (local/url/git-release providers). */
  private static async findViaProviderOrSlug(
    manager: ModManager,
    provider: Provider,
    id: string,
  ): Promise<FoundProject> {
    if (!manager.repoService.supportsDiscovery(provider)) {
      return { id, slug: id, name: id };
    }
    const found = await manager.repoService.findInProvider(provider, id);
    if (!found) {
      throw new Error(`No mod found for '${id}'`);
    }
    return found;
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
