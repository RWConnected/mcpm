import {writeFileSync} from "fs";
import type {ConfigPaths} from "../models/config.js";
import type {ResourceKind} from "../models/manifest.js";
import type {ModFactory} from "./mod-factory.js";

/** Factory for creating test mcpm.lock files */
export class LockfileFactory {
  private byKind: Record<ResourceKind, ModFactory[]> = { mod: [], datapack: [], resourcepack: [], shaderpack: [] };

  private constructor() {}

  static create(): LockfileFactory {
    return new LockfileFactory();
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
    writeFileSync(
      paths.lockPath,
      JSON.stringify(
        {
          mods: toLockObj(this.byKind.mod),
          datapacks: toLockObj(this.byKind.datapack),
          resourcepacks: toLockObj(this.byKind.resourcepack),
          shaderpacks: toLockObj(this.byKind.shaderpack),
        },
        null,
        2,
      ),
    );
  }
}

function toLockObj(items: ModFactory[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const m of items) {
    obj[m.id] = {
      id: m.id,
      version: m.version,
      minecraft_versions: m.minecraftVersions,
      url: m.url,
      hash: m.hash,
    };
  }
  return obj;
}
