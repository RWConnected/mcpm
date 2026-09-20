import {writeFileSync} from "fs";
import type {ConfigPaths} from "../models/config.js";
import type {ResourceKind} from "../models/manifest.js";
import type {ModFactory} from "./mod-factory.js";

/** Factory for creating test mcpm.json files */
export class ManifestFactory {
  private mcVersion: string;
  private byKind: Record<ResourceKind, ModFactory[]> = { mod: [], datapack: [], resourcepack: [], shaderpack: [] };

  private constructor(mcVersion: string) {
    this.mcVersion = mcVersion;
  }

  static create(mcVersion: string): ManifestFactory {
    return new ManifestFactory(mcVersion);
  }

  withMod(m: ModFactory): this {
    this.byKind.mod.push(m);
    return this;
  }

  withMods(mods: ModFactory[]): this {
    this.byKind.mod = [...mods];
    return this;
  }

  withDatapack(d: ModFactory): this {
    this.byKind.datapack.push(d);
    return this;
  }

  withDatapacks(datapacks: ModFactory[]): this {
    this.byKind.datapack = [...datapacks];
    return this;
  }

  withResourcepack(r: ModFactory): this {
    this.byKind.resourcepack.push(r);
    return this;
  }

  withResourcepacks(resourcepacks: ModFactory[]): this {
    this.byKind.resourcepack = [...resourcepacks];
    return this;
  }

  withShaderpack(s: ModFactory): this {
    this.byKind.shaderpack.push(s);
    return this;
  }

  withShaderpacks(shaderpacks: ModFactory[]): this {
    this.byKind.shaderpack = [...shaderpacks];
    return this;
  }

  writeTo(paths: ConfigPaths): void {
    const manifest = {
      name: "Pack",
      version: "1.0.0",
      side: "both",
      modloader: "fabric",
      minecraft_version: this.mcVersion,
      default_provider: "modrinth",
      mods: toVersionObj(this.byKind.mod),
      datapacks: toVersionObj(this.byKind.datapack),
      resourcepacks: toVersionObj(this.byKind.resourcepack),
      shaderpacks: toVersionObj(this.byKind.shaderpack),
    };
    writeFileSync(paths.manifestPath, JSON.stringify(manifest, null, 2));
  }
}

function toVersionObj(items: ModFactory[]): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const m of items) {
    obj[m.id] = m.version;
  }
  return obj;
}
