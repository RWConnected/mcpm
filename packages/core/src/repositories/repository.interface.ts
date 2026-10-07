import type {ModResult, VersionResult} from "../models/repository.js";
import type {LockEntry} from "../models/lockfile.js";

export interface IRepository {
  /** Whether search()/find() can look up a mod by query/slug, as opposed to only resolving
   * versions for an id the caller already knows (e.g. local/url/git-release providers). */
  readonly supportsDiscovery: boolean;
  search(query: string, page: number): Promise<ModResult[]>;
  find(slug: string): Promise<ModResult | undefined>;
  getVersions(
    projectId: string,
    gameVersions: string[],
    loaders: string[],
    wantedVersion?: string,
  ): Promise<VersionResult[]>;
  /** Optional auth headers to attach when downloading an asset URL this repository produced. */
  getDownloadHeaders?(url: string): Record<string, string> | undefined;
  /** Optional: URL to download a locked entry from, for providers whose locked url is not a
   * stable artifact (e.g. regenerated on demand). Defaults to the locked url. */
  resolveDownloadUrl?(entry: LockEntry, loaders: string[]): Promise<string>;
  /** Optional: hash of downloaded bytes compared against the locked hash, for providers whose
   * artifacts aren't byte-reproducible. Defaults to sha512 hex of the raw bytes. */
  contentHash?(bytes: Uint8Array): Promise<string>;
}
