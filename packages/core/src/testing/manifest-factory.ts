import { writeFileSync } from "fs";
import type { ConfigPaths } from "../models/config.js";
import type { ModFactory } from "./mod-factory.js";

/** Factory for creating test mcpm.json files */
export class ManifestFactory {
  private mcVersion: string;
  private mods: ModFactory[];

  private constructor(mcVersion: string) {
    this.mcVersion = mcVersion;
    this.mods = [];
  }

  static create(mcVersion: string): ManifestFactory {
    return new ManifestFactory(mcVersion);
  }

  withMod(m: ModFactory): this {
    this.mods.push(m);
    return this;
  }

  withMods(mods: ModFactory[]): this {
    this.mods = [...mods];
    return this;
  }

  writeTo(paths: ConfigPaths): void {
    const modsObj: Record<string, string> = {};
    for (const m of this.mods) {
      modsObj[m.id] = m.version;
    }
    const manifest = {
      name: "Pack",
      version: "1.0.0",
      side: "both",
      modloader: "fabric",
      minecraft_version: this.mcVersion,
      default_provider: "modrinth",
      mods: modsObj,
    };
    writeFileSync(paths.manifestPath, JSON.stringify(manifest, null, 2));
  }
}
