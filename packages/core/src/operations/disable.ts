import type {ModManager} from "./mod-manager.js";
import type {Provider} from "../models/manifest.js";
import {DISABLED_PREFIX} from "../models/manifest.js";

export type DisableOutcome = "disabled" | "already-disabled" | "not-found";

export class Disable {
  static async run(
    manager: ModManager,
    slug: string,
    provider?: Provider,
  ): Promise<DisableOutcome> {
    const resolvedProvider = provider ?? manager.manifestService.manifest.default_provider;
    const key = `${resolvedProvider}:${slug}`;
    const disabledKey = `${DISABLED_PREFIX}${key}`;
    const mods = manager.manifestService.manifest.mods;

    if (mods.has(disabledKey)) {
      return "already-disabled";
    }

    const version = mods.get(key);
    if (version === undefined) {
      return "not-found";
    }

    mods.delete(key);
    mods.set(disabledKey, version);
    manager.saveAll();

    return "disabled";
  }
}
