import type { ModManager } from "./mod-manager.js";
import { versionSpecToString } from "../models/manifest.js";

export class List {
  static async run(manager: ModManager): Promise<void> {
    const mods = manager.manifestModEntries();

    if (mods.length === 0) {
      manager.io.info("No mods installed.");
      return;
    }

    manager.io.info("Installed mods:");
    for (const entry of mods) {
      manager.io.print(
        ` - ${entry.provider}:${entry.slug} (${versionSpecToString(entry.version)})`,
      );
    }
  }
}
