import type {ModManager} from "./mod-manager.js";
import type {Provider, ResourceKind} from "../models/manifest.js";
import {removeModEntry} from "../models/manifest.js";

export class Remove {
  static async run(
    manager: ModManager,
    slug: string,
    provider?: Provider,
    kind: ResourceKind = "mod",
  ): Promise<string | undefined> {
    const resolvedProvider = provider ?? manager.manifestService.manifest.default_provider;
    const label = kind === "datapack" ? "Datapack" : "Mod";

    if (!removeModEntry(manager.manifestService.manifest, resolvedProvider, slug, kind)) {
      return `${label} '${slug}' not found in manifest`;
    }

    const key = `${resolvedProvider}:${slug}`;
    const lockMap = kind === "datapack" ? manager.lockService.lock.datapacks : manager.lockService.lock.mods;
    lockMap.delete(key);
    manager.saveAll();

    return undefined; // success, no warning
  }
}
