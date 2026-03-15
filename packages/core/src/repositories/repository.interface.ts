import type { ModResult, VersionResult } from "../models/repository.js";

export interface IRepository {
  search(query: string, page: number): Promise<ModResult[]>;
  find(slug: string): Promise<ModResult | undefined>;
  getVersions(
    projectId: string,
    gameVersions: string[],
    loaders: string[],
  ): Promise<VersionResult[]>;
}
