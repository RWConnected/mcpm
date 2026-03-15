import { writeFileSync } from "fs";
import type { ConfigPaths } from "../models/config.js";
import type { ModFactory } from "./mod-factory.js";

/** Factory for creating test mcpm.lock files */
export class LockfileFactory {
  private mods: ModFactory[];

  private constructor() {
    this.mods = [];
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

  writeTo(paths: ConfigPaths): void {
    const modsObj: Record<string, unknown> = {};
    for (const m of this.mods) {
      modsObj[m.id] = {
        id: m.id,
        version: m.version,
        minecraft_versions: m.minecraftVersions,
        url: m.url,
        hash: m.hash,
      };
    }
    writeFileSync(paths.lockPath, JSON.stringify({ mods: modsObj }, null, 2));
  }
}
