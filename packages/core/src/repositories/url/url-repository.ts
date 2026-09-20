import {createHash} from "crypto";
import type {IRepository} from "../repository.interface.js";
import type {ModResult, VersionResult} from "../../models/repository.js";
import type {UrlProviderConfig} from "../../models/provider-config.js";
import {resolveMcVersions} from "../mc-version-match.js";

export class UrlRepository implements IRepository {
  readonly supportsDiscovery = false;

  constructor(private readonly cfg: UrlProviderConfig) {}

  async search(): Promise<ModResult[]> {
    return [];
  }

  async find(): Promise<ModResult | undefined> {
    return undefined;
  }

  /** Only exact VersionSpecs are usable with a url provider — there is no API to enumerate versions. */
  async getVersions(
    slug: string,
    gameVersions: string[],
    _loaders: string[],
    wantedVersion?: string,
  ): Promise<VersionResult[]> {
    if (!wantedVersion) return [];

    const url = this.cfg.urlTemplate
      .replaceAll("{slug}", encodeURIComponent(slug))
      .replaceAll("{version}", encodeURIComponent(wantedVersion));

    const minecraftVersions = resolveMcVersions(this.cfg, wantedVersion, wantedVersion, gameVersions);
    if (minecraftVersions === undefined) return [];

    try {
      const res = await fetch(url, { headers: this.getDownloadHeaders(url) });
      if (!res.ok) return [];
      const bytes = new Uint8Array(await res.arrayBuffer());
      const hash = createHash("sha512").update(bytes).digest("hex");

      return [{ modId: slug, version: wantedVersion, minecraftVersions, url, hash }];
    } catch {
      return [];
    }
  }

  getDownloadHeaders(_url: string): Record<string, string> | undefined {
    if (!this.cfg.tokenEnv) return undefined;
    const token = process.env[this.cfg.tokenEnv];
    return token ? { Authorization: `Bearer ${token}` } : undefined;
  }
}
