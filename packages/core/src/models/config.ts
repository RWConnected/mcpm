// Config model ported from src-tauri/src/app/config.rs
// Key change: no global singleton — pure functions return Config objects

import { join, isAbsolute } from "path";
import { homedir } from "os";

export interface Config {
  readonly verbose: boolean;
  readonly quiet: boolean;
  readonly cacheDir: string;
  readonly projectDir: string;
  readonly outputDir: string;
  readonly modsDir: string;
  readonly modrinthToken?: string;
}

export interface ConfigPaths {
  readonly manifestPath: string;
  readonly lockPath: string;
  readonly gitignorePath: string;
}

export interface ConfigOptions {
  verbose?: boolean;
  quiet?: boolean;
  cacheDir?: string;
  projectDir?: string;
  outputDir?: string;
  modsDir?: string;
  modrinthToken?: string;
}

/** Resolve a Config from CLI options + env vars + defaults. Priority: CLI > env > default. */
export function resolveConfig(options: ConfigOptions = {}): Config {
  const projectDir = resolveProjectDir(options.projectDir);
  const outputDir = resolveRelativeTo(options.outputDir, "MCPM_OUTPUT_DIR", projectDir);
  const modsDir = resolveRelativeTo(options.modsDir, "MCPM_MODS_DIR", outputDir, "mods");
  const cacheDir = resolveCacheDir(options.cacheDir);

  return Object.freeze({
    verbose: options.verbose ?? false,
    quiet: options.quiet ?? false,
    cacheDir,
    projectDir,
    outputDir,
    modsDir,
    modrinthToken: resolveOptionalParam(options.modrinthToken, "MCPM_MODRINTH_TOKEN"),
  });
}

/** Derive file paths from a Config object */
export function configPaths(config: Config): ConfigPaths {
  return Object.freeze({
    manifestPath: join(config.projectDir, "mcpm.json"),
    lockPath: join(config.projectDir, "mcpm.lock"),
    gitignorePath: join(config.projectDir, ".gitignore"),
  });
}

function resolveCacheDir(cliValue?: string): string {
  if (cliValue) return cliValue;
  const envVal = process.env.MCPM_CACHE_DIR;
  if (envVal) return envVal;
  const home = homedir();
  if (home) return join(home, ".mcpm", "cache");
  return join(".mcpm", "cache");
}

function resolveProjectDir(cliValue?: string): string {
  const cwd = process.cwd();
  return resolveRelativeTo(cliValue, "MCPM_PROJECT_DIR", cwd);
}

function resolveRelativeTo(
  cliValue: string | undefined,
  envKey: string,
  relativeTo: string,
  defaultJoin?: string,
): string {
  // Priority 1: CLI argument
  if (cliValue) {
    return isAbsolute(cliValue) ? cliValue : join(relativeTo, cliValue);
  }

  // Priority 2: environment variable
  const envVal = process.env[envKey];
  if (envVal) {
    return isAbsolute(envVal) ? envVal : join(relativeTo, envVal);
  }

  // Default
  if (defaultJoin) return join(relativeTo, defaultJoin);
  return relativeTo;
}

function resolveOptionalParam(cliValue: string | undefined, envKey: string): string | undefined {
  if (cliValue) return cliValue;
  return process.env[envKey] || undefined;
}
