import type {ModManager} from "./mod-manager.js";
import type {Provider, ResourceKind} from "../models/manifest.js";
import {DISABLED_PREFIX, resourceMap} from "../models/manifest.js";

export type EnableOutcome = "enabled" | "already-enabled" | "not-found";

export class Enable {
  static async run(
    manager: ModManager,
    slug: string,
    provider?: Provider,
    kind: ResourceKind = "mod",
  ): Promise<EnableOutcome> {
    const resolvedProvider = provider ?? manager.manifestService.manifest.default_provider;
    const key = `${resolvedProvider}:${slug}`;
    const disabledKey = `${DISABLED_PREFIX}${key}`;
    const mods = resourceMap(manager.manifestService.manifest, kind);

    if (mods.has(key)) {
      return "already-enabled";
    }

    const version = mods.get(disabledKey);
    if (version === undefined) {
      return "not-found";
    }

    mods.delete(disabledKey);
    mods.set(key, version);
    manager.saveAll();

    return "enabled";
  }
}
