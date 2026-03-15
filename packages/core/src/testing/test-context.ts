import { mkdtempSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import type { Config, ConfigPaths } from "../models/config.js";
import { configPaths } from "../models/config.js";
import { QuietIO } from "./quiet-io.js";

/** Test isolation helper — creates temp dirs and provides config/io instances */
export class TestContext {
  readonly root: string;
  readonly config: Config;
  readonly paths: ConfigPaths;
  readonly io: QuietIO;

  constructor() {
    this.root = mkdtempSync(join(tmpdir(), "mcpm-test-"));

    const cacheDir = join(this.root, "cache");
    const modsDir = join(this.root, "mods");
    mkdirSync(cacheDir, { recursive: true });
    mkdirSync(modsDir, { recursive: true });

    this.config = Object.freeze({
      verbose: false,
      quiet: true,
      cacheDir,
      projectDir: this.root,
      outputDir: this.root,
      modsDir,
      modrinthToken: undefined,
    });

    this.paths = configPaths(this.config);
    this.io = new QuietIO();
  }

  cleanup(): void {
    rmSync(this.root, { recursive: true, force: true });
  }
}
