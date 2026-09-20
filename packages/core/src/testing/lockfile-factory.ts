import {writeFileSync} from "fs";
import type {ConfigPaths} from "../models/config.js";
import type {ModFactory} from "./mod-factory.js";

/** Factory for creating test mcpm.lock files */
export class LockfileFactory {
  private mods: ModFactory[];
  private datapacks: ModFactory[];

  private constructor() {
    this.mods = [];
    this.datapacks = [];
  }

  static create(): LockfileFactory {
    return new LockfileFactory();
  }

  withMod(m: ModFactory): this {
    this.mods.push(m);
    return this;
  }

  withMods(mods: ModFactory[]): this {
    this.mods = [...mods];
    return this;
  }

  withDatapack(d: ModFactory): this {
    this.datapacks.push(d);
    return this;
  }

  withDatapacks(datapacks: ModFactory[]): this {
    this.datapacks = [...datapacks];
    return this;
  }

  writeTo(paths: ConfigPaths): void {
    writeFileSync(
      paths.lockPath,
      JSON.stringify({ mods: toLockObj(this.mods), datapacks: toLockObj(this.datapacks) }, null, 2),
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
