import { createHash } from "crypto";
import { writeFileSync } from "fs";
import { join } from "path";
import type { Config } from "../models/config.js";
import type { VersionResult } from "../models/repository.js";

/** Factory for creating test mod definitions with sensible defaults */
export class ModFactory {
  readonly id: string;
  readonly version: string;
  readonly minecraftVersions: string[];
  readonly url: string;
  readonly content: Uint8Array;

  private constructor(
    id: string,
    version: string,
    minecraftVersions: string[],
    url: string,
    content: Uint8Array,
  ) {
    this.id = id;
    this.version = version;
    this.minecraftVersions = minecraftVersions;
    this.url = url;
    this.content = content;
  }

  static create(id: string, version: string): ModFactory {
    return new ModFactory(
      id,
      version,
      ["1.21.11"],
      `https://example.invalid/${id}-${version}.jar`,
      new TextEncoder().encode(`${id}@${version}`),
    );
  }

  forMcVersions(versions: string[]): ModFactory {
    return new ModFactory(this.id, this.version, versions, this.url, this.content);
  }

  withContent(bytes: Uint8Array): ModFactory {
    return new ModFactory(this.id, this.version, this.minecraftVersions, this.url, bytes);
  }

  get filename(): string {
    return `${this.id}-${this.version}.jar`;
  }

  get hash(): string {
    return createHash("sha512").update(this.content).digest("hex");
  }

  seedCache(config: Config): this {
    writeFileSync(join(config.cacheDir, this.filename), this.content);
    return this;
  }

  seedMod(config: Config): this {
    writeFileSync(join(config.modsDir, this.filename), this.content);
    return this;
  }

  toVersionResult(): VersionResult {
    return {
      modId: this.id,
      version: this.version,
      minecraftVersions: this.minecraftVersions,
      url: this.url,
      hash: this.hash,
    };
  }
}
