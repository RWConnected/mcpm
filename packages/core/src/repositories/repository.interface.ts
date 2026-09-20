import type {ModResult, VersionResult} from "../models/repository.js";

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
}
