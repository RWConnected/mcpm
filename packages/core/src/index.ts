// @mcpm/core - Shared business logic for MCPM

// Models
export type {
  Side, ModLoader, Provider, VersionSpec, ModEntry, Manifest, PartialManifest,
} from "./models/manifest.js";
export {
  isSemverRange, versionSpecFromString, versionSpecToString,
  defaultManifest, mergeManifest, modsAsEntries, modEntryToKey,
  insertModEntry, removeModEntry,
} from "./models/manifest.js";

export type { LockEntry, LockFile } from "./models/lockfile.js";
export { emptyLockFile } from "./models/lockfile.js";

export type { ModResult, VersionResult } from "./models/repository.js";

export type { Config, ConfigPaths, ConfigOptions } from "./models/config.js";
export { resolveConfig, configPaths } from "./models/config.js";

// IO
export type { IO, Output, Input, IOConfig, PromptResult } from "./io/io.types.js";
export { promptResponse, promptCancel, unwrapPrompt, isPromptCancel } from "./io/io.types.js";

// Interfaces
export type { IRepository } from "./repositories/repository.interface.js";
export type { DownloadService } from "./download/download-service.interface.js";

// Services
export { ManifestService } from "./services/manifest-service.js";
export { LockService } from "./services/lock-service.js";
export { RepositoryService } from "./repositories/repository-service.js";

// Implementations
export { HttpDownloadService } from "./download/http-download-service.js";
export { ModrinthRepository } from "./repositories/modrinth/modrinth-repository.js";

// Operations
export { ModManager } from "./operations/mod-manager.js";
export type { ModManagerDeps } from "./operations/mod-manager.js";
export { Install } from "./operations/install.js";
export { Upgrade } from "./operations/upgrade.js";
export type { UpgradeResult } from "./operations/upgrade.js";
export { Outdated } from "./operations/outdated.js";
export type { OutdatedResult, OutdatedEntry } from "./operations/outdated.js";
export { Add } from "./operations/add.js";
export type { AddOptions } from "./operations/add.js";
export { Remove } from "./operations/remove.js";
export { List } from "./operations/list.js";
export { Init } from "./operations/init.js";
export { Search } from "./operations/search.js";

// Helpers
export { resolveVersion, satisfies, compareVersions } from "./helpers/semver.js";
export { asStr } from "./helpers/utils.js";
