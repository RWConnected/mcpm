#!/usr/bin/env bun

import { Command } from "commander";
import { mkdirSync } from "node:fs";
import {
  resolveConfig,
  configPaths,
  ModManager,
  ModrinthRepository,
  HttpDownloadService,
  RepositoryService,
  type Config,
  type ConfigPaths,
  type IO,
} from "@mcpm/core";
import { CliIO } from "./cli-io.js";
import { registerCommands } from "./commands/index.js";

const program = new Command()
  .name("mcpm")
  .version("1.0.7")
  .description("Minecraft Package Manager for mods, resources and more.")
  .option("-v, --verbose", "Enable verbose output")
  .option("-q, --quiet", "Suppress all non-error output")
  .option("--project-dir <path>", "Project directory (env: MCPM_PROJECT_DIR)")
  .option("--cache-dir <path>", "Cache directory (env: MCPM_CACHE_DIR)")
  .option("--output-dir <path>", "Output directory (env: MCPM_OUTPUT_DIR)")
  .option("--mods-dir <path>", "Mods directory (env: MCPM_MODS_DIR)")
  .option("--modrinth-token <token>", "Modrinth API token (env: MCPM_MODRINTH_TOKEN)");

// Lazily-initialized state
let _config: Config | undefined;
let _paths: ConfigPaths | undefined;
let _io: IO | undefined;
let _repoService: RepositoryService | undefined;

function ensureConfig(): { config: Config; paths: ConfigPaths; io: IO } {
  if (_config && _paths && _io) return { config: _config, paths: _paths, io: _io };

  const opts = program.optsWithGlobals();
  _config = resolveConfig({
    verbose: opts.verbose,
    quiet: opts.quiet,
    projectDir: opts.projectDir,
    cacheDir: opts.cacheDir,
    outputDir: opts.outputDir,
    modsDir: opts.modsDir,
    modrinthToken: opts.modrinthToken,
  });
  _paths = configPaths(_config);
  _io = new CliIO({ verbose: _config.verbose, quiet: _config.quiet });

  // Ensure directories exist
  mkdirSync(_config.cacheDir, { recursive: true });
  mkdirSync(_config.projectDir, { recursive: true });
  mkdirSync(_config.outputDir, { recursive: true });
  mkdirSync(_config.modsDir, { recursive: true });

  return { config: _config, paths: _paths, io: _io };
}

function getRepoService(): RepositoryService {
  if (_repoService) return _repoService;
  const { config } = ensureConfig();
  _repoService = new RepositoryService();
  _repoService.addProvider("modrinth", new ModrinthRepository(config.modrinthToken));
  return _repoService;
}

registerCommands(program, {
  getPaths: () => ensureConfig().paths,
  getIO: () => ensureConfig().io,
  getManager: async () => {
    const { config, paths, io } = ensureConfig();
    const manager = new ModManager({
      config,
      paths,
      io,
      downloadService: new HttpDownloadService(),
      repositoryService: getRepoService(),
    });
    await manager.load();
    return manager;
  },
  getRepoService,
});

program.parse();
