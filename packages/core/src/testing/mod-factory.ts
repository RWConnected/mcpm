import {createHash} from "crypto";
import {writeFileSync} from "fs";
import {join} from "path";
import type {Config} from "../models/config.js";
import type {ResourceKind} from "../models/manifest.js";
import type {VersionResult} from "../models/repository.js";

/** Factory for creating test mod/datapack definitions with sensible defaults */
export class ModFactory {
  readonly id: string;
  readonly version: string;
  readonly minecraftVersions: string[];
  readonly url: string;
  readonly content: Uint8Array;
  readonly kind: ResourceKind;

  private constructor(
    id: string,
    version: string,
    minecraftVersions: string[],
    url: string,
    content: Uint8Array,
    kind: ResourceKind,
  ) {
    this.id = id;
    this.version = version;
    this.minecraftVersions = minecraftVersions;
    this.url = url;
    this.content = content;
    this.kind = kind;
  }

  static create(id: string, version: string, kind: ResourceKind = "mod"): ModFactory {
    const extension = kind === "mod" ? "jar" : "zip";
    return new ModFactory(
      id,
      version,
      ["1.21.11"],
      `https://example.invalid/${id}-${version}.${extension}`,
      new TextEncoder().encode(`${id}@${version}`),
      kind,
    );
  }

  forMcVersions(versions: string[]): ModFactory {
    return new ModFactory(this.id, this.version, versions, this.url, this.content, this.kind);
  }

  withContent(bytes: Uint8Array): ModFactory {
    return new ModFactory(this.id, this.version, this.minecraftVersions, this.url, bytes, this.kind);
  }

  get filename(): string {
    const extension = this.kind === "mod" ? "jar" : "zip";
    return `${this.id}-${this.version}.${extension}`;
  }

  get hash(): string {
    return createHash("sha512").update(this.content).digest("hex");
  }

  seedCache(config: Config): this {
    return this.seedInto(config.cacheDir);
  }

  seedMod(config: Config): this {
    return this.seedInto(config.modsDir);
  }

  seedDatapack(config: Config): this {
    return this.seedInto(config.datapacksDir);
  }

  seedResourcepack(config: Config): this {
    return this.seedInto(config.resourcepacksDir);
  }

  seedShaderpack(config: Config): this {
    return this.seedInto(config.shaderpacksDir);
  }

  private seedInto(dir: string): this {
    writeFileSync(join(dir, this.filename), this.content);
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
