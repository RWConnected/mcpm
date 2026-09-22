import {existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync} from "fs";
import {dirname, isAbsolute, join, relative, sep} from "path";
import {createHash} from "crypto";
import {pathToFileURL} from "url";
import JSZip from "jszip";
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
    private readonly cacheDir: string,
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
      const dir = this.resolveSlugDir(slug);
      if (!dir) return [];

      const versions = wantedVersion ? [wantedVersion] : listVersions(dir);

      const results: VersionResult[] = [];
      for (const version of versions) {
        const resolved = await this.resolveVersion(dir, slug, version, gameVersions);
        if (resolved) results.push(resolved);
      }
      return results;
    } catch {
      return [];
    }
  }

  /** Resolves "{basePath}/{slug}" case-insensitively (manifest keys/JSON commonly get
   * lowercased/retyped by hand, but filesystems on Linux/macOS are case-sensitive) — exact match
   * wins if present, otherwise the first directory entry matching slug case-insensitively. */
  private resolveSlugDir(slug: string): string | undefined {
    const exact = join(this.basePath, slug);
    if (existsSync(exact)) return exact;
    if (!existsSync(this.basePath)) return undefined;

    const lower = slug.toLowerCase();
    const match = readdirSync(this.basePath, { withFileTypes: true })
      .find((entry) => entry.isDirectory() && entry.name.toLowerCase() === lower);
    return match ? join(this.basePath, match.name) : undefined;
  }

  /** A version resolves, in order: a "{version}.jar" archive; a "{version}/" directory holding
   * raw content (e.g. pack.mcmeta + data/...); or, as a last resort, the slug directory itself
   * treated as the content — for a flat single-version layout with no version subfolder at all,
   * where the manifest's version is just a label rather than something reflected on disk. */
  private async resolveVersion(
    dir: string,
    slug: string,
    version: string,
    gameVersions: string[],
  ): Promise<VersionResult | undefined> {
    const filePath = join(dir, `${version}.jar`);
    if (existsSync(filePath)) {
      const fileName = `${version}.jar`;
      const minecraftVersions = resolveMcVersions(this.cfg, fileName, fileName, gameVersions);
      if (minecraftVersions === undefined) return undefined;

      const bytes = readFileSync(filePath);
      const hash = createHash("sha512").update(bytes).digest("hex");
      return { modId: slug, version, minecraftVersions, url: pathToFileURL(filePath).toString(), hash };
    }

    const versionedDir = join(dir, version);
    const contentDir = existsSync(versionedDir) && statSync(versionedDir).isDirectory() ? versionedDir : dir;

    const minecraftVersions = resolveMcVersions(this.cfg, version, version, gameVersions);
    if (minecraftVersions === undefined) return undefined;

    const bytes = await zipDirectory(contentDir);
    const zipPath = join(this.cacheDir, "local-zips", this.cfg.id, slug, `${version}.zip`);
    mkdirSync(dirname(zipPath), { recursive: true });
    writeFileSync(zipPath, bytes);

    const hash = createHash("sha512").update(bytes).digest("hex");
    return { modId: slug, version, minecraftVersions, url: pathToFileURL(zipPath).toString(), hash };
  }
}

/** Version candidates when none is explicitly requested: ".jar" files (minus extension) and
 * plain subdirectories (content to be zipped on demand). */
function listVersions(dir: string): string[] {
  const versions = new Set<string>();
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".jar")) {
      versions.add(entry.name.slice(0, -".jar".length));
    } else if (entry.isDirectory()) {
      versions.add(entry.name);
    }
  }
  return [...versions];
}

/** Zips a directory's contents (recursively) into an in-memory buffer — for a raw content
 * directory (e.g. pack.mcmeta-style datapack) instead of a pre-built archive. */
async function zipDirectory(dirPath: string): Promise<Buffer> {
  const zip = new JSZip();
  addDirToZip(zip, dirPath, dirPath);
  return zip.generateAsync({ type: "nodebuffer" });
}

function addDirToZip(zip: JSZip, rootPath: string, currentPath: string): void {
  for (const entry of readdirSync(currentPath, { withFileTypes: true })) {
    const fullPath = join(currentPath, entry.name);
    if (entry.isDirectory()) {
      addDirToZip(zip, rootPath, fullPath);
    } else if (entry.isFile()) {
      const relPath = relative(rootPath, fullPath).split(sep).join("/");
      zip.file(relPath, readFileSync(fullPath));
    }
  }
}
