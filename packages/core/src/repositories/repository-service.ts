// RepositoryService ported from src-tauri/src/app/modules/repositories/services.rs

import type {IRepository} from "./repository.interface.js";
import type {ModResult, VersionResult} from "../models/repository.js";

export class RepositoryService {
  private repositories = new Map<string, IRepository>();

  addProvider(name: string, provider: IRepository): this {
    this.repositories.set(name.toLowerCase(), provider);
    return this;
  }

  async search(query: string, page: number): Promise<ModResult[]> {
    const results: ModResult[] = [];
    for (const provider of this.repositories.values()) {
      const r = await provider.search(query, page);
      results.push(...r);
    }
    return results;
  }

  async find(slug: string): Promise<ModResult | undefined> {
    for (const provider of this.repositories.values()) {
      const result = await provider.find(slug);
      if (result) return result;
    }
    return undefined;
  }

  /** Find a mod through one specific registered provider (no fan-out). */
  async findInProvider(providerId: string, slug: string): Promise<ModResult | undefined> {
    return this.repositories.get(providerId.toLowerCase())?.find(slug);
  }

  /** Whether the given provider can look up a mod by slug/query, as opposed to only
   * resolving versions for an id the caller already knows. Unregistered providers report false. */
  supportsDiscovery(providerId: string): boolean {
    return this.repositories.get(providerId.toLowerCase())?.supportsDiscovery ?? false;
  }

  async getVersions(
    projectId: string,
    gameVersions: string[],
    loaders: string[],
    wantedVersion?: string,
  ): Promise<VersionResult[]> {
    // Split "provider:id" into provider name and clean id
    const colonIdx = projectId.indexOf(":");
    const providerName = colonIdx >= 0 ? projectId.slice(0, colonIdx).toLowerCase() : "modrinth";
    const cleanId = colonIdx >= 0 ? projectId.slice(colonIdx + 1) : projectId;

    const provider = this.repositories.get(providerName);
    if (!provider) return [];

    return provider.getVersions(cleanId, gameVersions, loaders, wantedVersion);
  }

  /** Auth headers (if any) a provider wants attached when downloading the given asset URL. */
  getDownloadHeaders(providerId: string, url: string): Record<string, string> | undefined {
    return this.repositories.get(providerId.toLowerCase())?.getDownloadHeaders?.(url);
  }
}
