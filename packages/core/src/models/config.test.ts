import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { resolveConfig, configPaths } from "./config.js";

describe("resolveConfig", () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    // Save and clear MCPM env vars
    for (const key of [
      "MCPM_PROJECT_DIR",
      "MCPM_CACHE_DIR",
      "MCPM_OUTPUT_DIR",
      "MCPM_MODS_DIR",
      "MCPM_MODRINTH_TOKEN",
    ]) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    // Restore env vars
    for (const [key, val] of Object.entries(savedEnv)) {
      if (val === undefined) delete process.env[key];
      else process.env[key] = val;
    }
  });

  it("uses defaults when no options or env vars set", () => {
    const config = resolveConfig({});
    expect(config.verbose).toBe(false);
    expect(config.quiet).toBe(false);
    expect(config.cacheDir).toContain(".mcpm/cache");
    expect(config.modsDir).toContain("mods");
    expect(config.modrinthToken).toBeUndefined();
  });

  it("CLI options take highest priority", () => {
    process.env.MCPM_CACHE_DIR = "/env/cache";
    const config = resolveConfig({ cacheDir: "/cli/cache" });
    expect(config.cacheDir).toBe("/cli/cache");
  });

  it("env vars take priority over defaults", () => {
    process.env.MCPM_CACHE_DIR = "/env/cache";
    const config = resolveConfig({});
    expect(config.cacheDir).toBe("/env/cache");
  });

  it("resolves modrinth token from CLI option", () => {
    const config = resolveConfig({ modrinthToken: "my-token" });
    expect(config.modrinthToken).toBe("my-token");
  });

  it("resolves modrinth token from env var", () => {
    process.env.MCPM_MODRINTH_TOKEN = "env-token";
    const config = resolveConfig({});
    expect(config.modrinthToken).toBe("env-token");
  });

  it("resolves relative output dir against project dir", () => {
    const config = resolveConfig({
      projectDir: "/my/project",
      outputDir: "build",
    });
    expect(config.outputDir).toBe("/my/project/build");
  });

  it("preserves absolute output dir", () => {
    const config = resolveConfig({
      projectDir: "/my/project",
      outputDir: "/absolute/output",
    });
    expect(config.outputDir).toBe("/absolute/output");
  });

  it("resolves mods dir relative to output dir", () => {
    const config = resolveConfig({
      projectDir: "/my/project",
      outputDir: "/my/output",
    });
    expect(config.modsDir).toBe("/my/output/mods");
  });

  it("config is frozen (immutable)", () => {
    const config = resolveConfig({});
    expect(() => {
      (config as any).verbose = true;
    }).toThrow();
  });
});

describe("configPaths", () => {
  it("derives correct paths from config", () => {
    const config = resolveConfig({ projectDir: "/my/project" });
    const paths = configPaths(config);
    expect(paths.manifestPath).toBe("/my/project/mcpm.json");
    expect(paths.lockPath).toBe("/my/project/mcpm.lock");
    expect(paths.gitignorePath).toBe("/my/project/.gitignore");
  });
});
