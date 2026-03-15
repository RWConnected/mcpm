// ModManager ported from src-tauri/src/app/modules/core/ops/manager.rs

import type { Config, ConfigPaths } from "../models/config.js";
import type { IO } from "../io/io.types.js";
import type { DownloadService } from "../download/download-service.interface.js";
import type { ModEntry } from "../models/manifest.js";
import type { VersionResult } from "../models/repository.js";
import { modsAsEntries } from "../models/manifest.js";
import { ManifestService } from "../services/manifest-service.js";
import { LockService } from "../services/lock-service.js";
import { RepositoryService } from "../repositories/repository-service.js";

export interface ModManagerDeps {
  config: Config;
  paths: ConfigPaths;
  io: IO;
  downloadService: DownloadService;
  repositoryService?: RepositoryService;
}

export class ModManager {
  readonly manifestService: ManifestService;
  readonly lockService: LockService;
  readonly repoService: RepositoryService;
  readonly downloadService: DownloadService;
  readonly config: Config;
  readonly io: IO;

  constructor(deps: ModManagerDeps) {
    this.config = deps.config;
    this.io = deps.io;
    this.manifestService = new ManifestService(deps.paths, deps.io);
    this.lockService = new LockService(deps.paths, deps.io);
    this.repoService = deps.repositoryService ?? new RepositoryService();
    this.downloadService = deps.downloadService;
  }

  async load(): Promise<void> {
    this.lockService.load();
    this.manifestService.load();
  }

  manifestModEntries(): ModEntry[] {
    return modsAsEntries(this.manifestService.manifest);
  }

  async refreshMod(
    entry: ModEntry,
    available?: VersionResult[],
    upgrade = false,
    ignoreConstraints = false,
  ): Promise<void> {
    const success = await this.lockService.updateEntry(
      entry,
      this.manifestService.manifest,
      this.repoService,
      available,
      upgrade,
      ignoreConstraints,
    );
    if (!success) {
      throw new Error(`Failed to update ${entry.slug}`);
    }
  }

  saveAll(): void {
    this.manifestService.save();
    this.lockService.save();
  }
}
