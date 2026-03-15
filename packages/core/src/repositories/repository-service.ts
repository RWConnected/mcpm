// RepositoryService ported from src-tauri/src/app/modules/repositories/services.rs

import type { IRepository } from "./repository.interface.js";
import type { ModResult, VersionResult } from "../models/repository.js";

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

  async getVersions(
    projectId: string,
    gameVersions: string[],
    loaders: string[],
  ): Promise<VersionResult[]> {
    // Split "provider:id" into provider name and clean id
    const colonIdx = projectId.indexOf(":");
    const providerName = colonIdx >= 0 ? projectId.slice(0, colonIdx).toLowerCase() : "modrinth";
    const cleanId = colonIdx >= 0 ? projectId.slice(colonIdx + 1) : projectId;

    const provider = this.repositories.get(providerName);
    if (!provider) return [];

    return provider.getVersions(cleanId, gameVersions, loaders);
  }
}
