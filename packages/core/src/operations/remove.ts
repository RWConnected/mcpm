import type { ModManager } from "./mod-manager.js";
import type { Provider } from "../models/manifest.js";
import { removeModEntry } from "../models/manifest.js";

export class Remove {
  static async run(
    manager: ModManager,
    slug: string,
    provider?: Provider,
  ): Promise<string | undefined> {
    const resolvedProvider = provider ?? manager.manifestService.manifest.default_provider;

    if (!removeModEntry(manager.manifestService.manifest, resolvedProvider, slug)) {
      return `Mod '${slug}' not found in manifest`;
    }

    const key = `${resolvedProvider}:${slug}`;
    manager.lockService.lock.mods.delete(key);
    manager.saveAll();

    return undefined; // success, no warning
  }
}
