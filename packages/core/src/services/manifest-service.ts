// ManifestService ported from src-tauri/src/app/modules/manifest/services.rs

import {existsSync, readFileSync, writeFileSync} from "fs";
import type {ConfigPaths} from "../models/config.js";
import type {IO} from "../io/io.types.js";
import {
  defaultManifest,
  type Manifest,
  mergeManifest,
  type PartialManifest,
  type VersionSpec,
  versionSpecFromString,
  versionSpecToString,
} from "../models/manifest.js";
import {type ProviderConfig, validateProviders} from "../models/provider-config.js";

const RESOURCE_FIELDS = ["mods", "datapacks", "resourcepacks", "shaderpacks"] as const;

const RECOMMENDED_IGNORES = [
  "mods/", "datapacks/", "resourcepacks/", "shaderpacks/", "crash-reports/", "logs/", "saves/",
];

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

    // Convert each resource object to Map<string, VersionSpec>
    const resourceMaps: Record<string, Map<string, VersionSpec>> = {};
    for (const field of RESOURCE_FIELDS) {
      const map = new Map<string, VersionSpec>();
      if (raw[field] && typeof raw[field] === "object") {
        for (const [key, value] of Object.entries(raw[field])) {
          map.set(key, versionSpecFromString(value as string));
        }
      }
      resourceMaps[field] = map;
    }

    const providers: ProviderConfig[] | undefined = Array.isArray(raw.providers) ? raw.providers : undefined;

    const partial: PartialManifest = { ...raw, ...resourceMaps, providers };
    this.manifest = mergeManifest(partial);

    const { invalid } = validateProviders(this.manifest.providers);
    for (const { config, reason } of invalid) {
      this.io.warn(`Provider '${config.id}' is misconfigured (${reason}); mods using it will fail.`);
    }
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

    // Convert each resource Map to an ordered object for JSON serialization
    for (const field of RESOURCE_FIELDS) {
      const resourceObj: Record<string, string> = {};
      for (const [key, spec] of this.manifest[field]) {
        resourceObj[key] = versionSpecToString(spec);
      }
      obj[field] = resourceObj;
    }

    if (this.manifest.license !== undefined) obj.license = this.manifest.license;
    if (this.manifest.homepage !== undefined) obj.homepage = this.manifest.homepage;
    if (this.manifest.tags !== undefined) obj.tags = this.manifest.tags;
    if (this.manifest.providers !== undefined) obj.providers = this.manifest.providers;

    return JSON.stringify(obj, null, 2);
  }
}
