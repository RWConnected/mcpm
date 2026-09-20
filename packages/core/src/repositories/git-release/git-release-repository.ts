import {createHash} from "crypto";
import type {IRepository} from "../repository.interface.js";
import type {ModResult, VersionResult} from "../../models/repository.js";
import type {GithubProviderConfig, GitlabProviderConfig} from "../../models/provider-config.js";
import {resolveMcVersions} from "../mc-version-match.js";

interface ReleaseAsset {
  readonly name: string;
  readonly url: string;
}

interface Release {
  readonly tagName: string;
  readonly assets: ReleaseAsset[];
}

/** Resolves mod versions from GitHub or GitLab release tags/assets. One config = one upstream repo. */
export class GitReleaseRepository implements IRepository {
  readonly supportsDiscovery = false;

  constructor(private readonly cfg: GithubProviderConfig | GitlabProviderConfig) {}

  async search(): Promise<ModResult[]> {
    return [];
  }

  async find(): Promise<ModResult | undefined> {
    return undefined;
  }

  async getVersions(
    _projectId: string,
    gameVersions: string[],
    _loaders: string[] = [],
    _wantedVersion?: string,
  ): Promise<VersionResult[]> {
    try {
      const releases = await this.fetchReleases();
      const results: VersionResult[] = [];

      for (const release of releases) {
        const asset = this.pickAsset(release.assets);
        if (!asset) continue;

        const minecraftVersions = resolveMcVersions(this.cfg, release.tagName, asset.name, gameVersions);
        if (!minecraftVersions) continue;

        const hash = await this.resolveHash(release.assets, asset);
        if (!hash) continue;

        results.push({
          modId: `${this.cfg.owner}/${this.cfg.repo}`,
          version: release.tagName,
          minecraftVersions,
          url: asset.url,
          hash,
        });
      }

      return results;
    } catch {
      return [];
    }
  }

  getDownloadHeaders(): Record<string, string> | undefined {
    const token = this.cfg.tokenEnv ? process.env[this.cfg.tokenEnv] : undefined;
    if (!token) return undefined;
    return this.cfg.type === "gitlab" ? { "PRIVATE-TOKEN": token } : { Authorization: `Bearer ${token}` };
  }

  private requestHeaders(): Record<string, string> {
    const base: Record<string, string> = this.cfg.type === "github" ? { Accept: "application/vnd.github+json" } : {};
    return { ...base, ...this.getDownloadHeaders() };
  }

  private async fetchReleases(): Promise<Release[]> {
    if (this.cfg.type === "github") {
      const url = `https://api.github.com/repos/${this.cfg.owner}/${this.cfg.repo}/releases?per_page=100`;
      const res = await fetch(url, { headers: this.requestHeaders() });
      if (!res.ok) return [];
      const body = (await res.json()) as {
        tag_name: string;
        assets: { name: string; browser_download_url: string }[];
      }[];
      return body.map((r) => ({
        tagName: r.tag_name,
        assets: (r.assets ?? []).map((a) => ({ name: a.name, url: a.browser_download_url })),
      }));
    }

    const host = this.cfg.host ?? "gitlab.com";
    const projectPath = encodeURIComponent(`${this.cfg.owner}/${this.cfg.repo}`);
    const url = `https://${host}/api/v4/projects/${projectPath}/releases?per_page=100`;
    const res = await fetch(url, { headers: this.requestHeaders() });
    if (!res.ok) return [];
    const body = (await res.json()) as {
      tag_name: string;
      assets?: { links?: { name: string; url: string }[] };
    }[];
    return body.map((r) => ({
      tagName: r.tag_name,
      assets: (r.assets?.links ?? []).map((a) => ({ name: a.name, url: a.url })),
    }));
  }

  private pickAsset(assets: ReleaseAsset[]): ReleaseAsset | undefined {
    if (this.cfg.assetPattern) {
      const pattern = new RegExp(this.cfg.assetPattern);
      return assets.find((a) => pattern.test(a.name));
    }
    return assets.find((a) => a.name.endsWith(".jar"));
  }

  private async resolveHash(assets: ReleaseAsset[], asset: ReleaseAsset): Promise<string | undefined> {
    const sidecar = assets.find((a) => a.name === `${asset.name}.sha512`);
    if (sidecar) {
      try {
        const res = await fetch(sidecar.url, { headers: this.requestHeaders() });
        if (res.ok) {
          const hex = (await res.text()).trim().split(/\s+/)[0]?.toLowerCase();
          if (hex && /^[0-9a-f]{128}$/.test(hex)) return hex;
        }
      } catch {
        // fall through to full-download hashing
      }
    }

    try {
      const res = await fetch(asset.url, { headers: this.requestHeaders() });
      if (!res.ok) return undefined;
      const bytes = new Uint8Array(await res.arrayBuffer());
      return createHash("sha512").update(bytes).digest("hex");
    } catch {
      return undefined;
    }
  }
}
