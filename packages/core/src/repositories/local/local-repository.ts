import {existsSync, readdirSync, readFileSync} from "fs";
import {isAbsolute, join} from "path";
import {createHash} from "crypto";
import {pathToFileURL} from "url";
import type {IRepository} from "../repository.interface.js";
import type {ModResult, VersionResult} from "../../models/repository.js";
import type {LocalProviderConfig} from "../../models/provider-config.js";
import {resolveMcVersions} from "../mc-version-match.js";

export class LocalRepository implements IRepository {
  readonly supportsDiscovery = false;

  private readonly basePath: string;

  constructor(
    private readonly cfg: LocalProviderConfig,
    projectDir: string,
  ) {
    this.basePath = isAbsolute(cfg.basePath) ? cfg.basePath : join(projectDir, cfg.basePath);
  }

  async search(): Promise<ModResult[]> {
    return [];
  }

  async find(): Promise<ModResult | undefined> {
    return undefined;
  }

  async getVersions(
    slug: string,
    gameVersions: string[],
    _loaders: string[],
    wantedVersion?: string,
  ): Promise<VersionResult[]> {
    try {
      const dir = join(this.basePath, slug);
      if (!existsSync(dir)) return [];

      const fileNames = wantedVersion
        ? [`${wantedVersion}.jar`].filter((f) => existsSync(join(dir, f)))
        : readdirSync(dir).filter((f) => f.endsWith(".jar"));

      const results: VersionResult[] = [];
      for (const fileName of fileNames) {
        const version = fileName.slice(0, -".jar".length);
        const minecraftVersions = resolveMcVersions(this.cfg, fileName, fileName, gameVersions);
        if (minecraftVersions === undefined) continue;

        const fullPath = join(dir, fileName);
        const bytes = readFileSync(fullPath);
        const hash = createHash("sha512").update(bytes).digest("hex");

        results.push({
          modId: slug,
          version,
          minecraftVersions,
          url: pathToFileURL(fullPath).toString(),
          hash,
        });
      }
      return results;
    } catch {
      return [];
    }
  }
}
