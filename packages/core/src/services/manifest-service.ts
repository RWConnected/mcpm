// ManifestService ported from src-tauri/src/app/modules/manifest/services.rs

import { readFileSync, writeFileSync, existsSync } from "fs";
import type { ConfigPaths } from "../models/config.js";
import type { IO } from "../io/io.types.js";
import {
  type Manifest,
  type PartialManifest,
  type VersionSpec,
  mergeManifest,
  defaultManifest,
  versionSpecFromString,
  versionSpecToString,
} from "../models/manifest.js";

const RECOMMENDED_IGNORES = ["mods/", "crash-reports/", "logs/", "saves/"];

export class ManifestService {
  manifest: Manifest;

  constructor(
    private readonly paths: ConfigPaths,
    private readonly io: IO,
  ) {
    this.manifest = defaultManifest();
  }

  /** Load manifest from disk. Throws if file missing. Partial manifests are merged with defaults. */
  load(): void {
    const content = readFileSync(this.paths.manifestPath, "utf-8");
    const raw = JSON.parse(content);

    // Convert mods object to Map<string, VersionSpec>
    const mods = new Map<string, VersionSpec>();
    if (raw.mods && typeof raw.mods === "object") {
      for (const [key, value] of Object.entries(raw.mods)) {
        mods.set(key, versionSpecFromString(value as string));
      }
    }

    const partial: PartialManifest = { ...raw, mods };
    this.manifest = mergeManifest(partial);
  }

  /** Save manifest to disk as pretty JSON */
  save(): void {
    const json = this.serializeManifest();
    writeFileSync(this.paths.manifestPath, json);
  }

  /** Initialize: create manifest if missing, normalize if exists, create .gitignore */
  init(): void {
    if (!existsSync(this.paths.manifestPath)) {
      this.save();
    } else {
      this.normalize();
    }
    this.initGitignore();
  }

  private normalize(): void {
    this.load();
    this.save();
    this.io.info(`Normalized existing ${this.paths.manifestPath}`);
  }

  private initGitignore(): void {
    if (!existsSync(this.paths.gitignorePath)) {
      const content = RECOMMENDED_IGNORES.join("\n") + "\n";
      writeFileSync(this.paths.gitignorePath, content);
      this.io.success(`Created ${this.paths.gitignorePath} with recommended entries`);
    } else {
      this.io.warn(`${this.paths.gitignorePath} already exists, recommended entries you may want to include:`);
      for (const entry of RECOMMENDED_IGNORES) {
        this.io.print(`   ${entry}`);
      }
    }
  }

  private serializeManifest(): string {
    // Convert Map to ordered object for JSON serialization
    const modsObj: Record<string, string> = {};
    for (const [key, spec] of this.manifest.mods) {
      modsObj[key] = versionSpecToString(spec);
    }

    const obj: Record<string, unknown> = {
      name: this.manifest.name,
      version: this.manifest.version,
    };
    if (this.manifest.description !== undefined) obj.description = this.manifest.description;
    if (this.manifest.author !== undefined) obj.author = this.manifest.author;
    obj.side = this.manifest.side;
    obj.modloader = this.manifest.modloader;
    obj.minecraft_version = this.manifest.minecraft_version;
    obj.default_provider = this.manifest.default_provider;
    obj.mods = modsObj;
    if (this.manifest.license !== undefined) obj.license = this.manifest.license;
    if (this.manifest.homepage !== undefined) obj.homepage = this.manifest.homepage;
    if (this.manifest.tags !== undefined) obj.tags = this.manifest.tags;

    return JSON.stringify(obj, null, 2);
  }
}
