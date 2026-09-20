import type {ModManager} from "./mod-manager.js";
import type {Provider, ResourceKind} from "../models/manifest.js";
import {removeModEntry} from "../models/manifest.js";
import {lockResourceMap} from "../models/lockfile.js";

const LABELS: Record<ResourceKind, string> = {
  mod: "Mod",
  datapack: "Datapack",
  resourcepack: "Resourcepack",
  shaderpack: "Shaderpack",
};

export class Remove {
  static async run(
    manager: ModManager,
    slug: string,
    provider?: Provider,
    kind: ResourceKind = "mod",
  ): Promise<string | undefined> {
    const resolvedProvider = provider ?? manager.manifestService.manifest.default_provider;

    if (!removeModEntry(manager.manifestService.manifest, resolvedProvider, slug, kind)) {
      return `${LABELS[kind]} '${slug}' not found in manifest`;
    }

    const key = `${resolvedProvider}:${slug}`;
    lockResourceMap(manager.lockService.lock, kind).delete(key);
    manager.saveAll();

    return undefined; // success, no warning
  }
}
