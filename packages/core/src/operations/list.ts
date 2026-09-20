import type {ModManager} from "./mod-manager.js";
import {versionSpecToString} from "../models/manifest.js";

export class List {
  static async run(manager: ModManager): Promise<void> {
    const mods = manager.manifestEntries("mod");
    const datapacks = manager.manifestEntries("datapack");

    if (mods.length === 0 && datapacks.length === 0) {
      manager.io.info("No mods or datapacks installed.");
      return;
    }

    if (mods.length > 0) {
      manager.io.info("Installed mods:");
      for (const entry of mods) {
        const suffix = entry.disabled ? " [disabled]" : "";
        manager.io.print(
          ` - ${entry.provider}:${entry.slug} (${versionSpecToString(entry.version)})${suffix}`,
        );
      }
    }

    if (datapacks.length > 0) {
      manager.io.info("Installed datapacks:");
      for (const entry of datapacks) {
        const suffix = entry.disabled ? " [disabled]" : "";
        manager.io.print(
          ` - ${entry.provider}:${entry.slug} (${versionSpecToString(entry.version)})${suffix}`,
        );
      }
    }
  }
}
