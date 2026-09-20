import type {ModManager} from "./mod-manager.js";
import {versionSpecToString} from "../models/manifest.js";

const SECTIONS: Record<"mod" | "datapack" | "resourcepack" | "shaderpack", string> = {
  mod: "Installed mods:",
  datapack: "Installed datapacks:",
  resourcepack: "Installed resourcepacks:",
  shaderpack: "Installed shaderpacks:",
};

export class List {
  static async run(manager: ModManager): Promise<void> {
    const byKind = (["mod", "datapack", "resourcepack", "shaderpack"] as const).map((kind) => ({
      kind,
      entries: manager.manifestEntries(kind),
    }));

    if (byKind.every(({ entries }) => entries.length === 0)) {
      manager.io.info("No mods, datapacks, resourcepacks or shaderpacks installed.");
      return;
    }

    for (const { kind, entries } of byKind) {
      if (entries.length === 0) continue;
      manager.io.info(SECTIONS[kind]);
      for (const entry of entries) {
        const suffix = entry.disabled ? " [disabled]" : "";
        manager.io.print(
          ` - ${entry.provider}:${entry.slug} (${versionSpecToString(entry.version)})${suffix}`,
        );
      }
    }
  }
}
