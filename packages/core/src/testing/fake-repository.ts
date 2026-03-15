import type { IRepository } from "../repositories/repository.interface.js";
import type { ModResult, VersionResult } from "../models/repository.js";
import type { ModFactory } from "./mod-factory.js";

/** Fake repository for testing — returns pre-configured versions, filters by MC version */
export class FakeRepository implements IRepository {
  private versions: VersionResult[] = [];

  withVersion(mf: ModFactory): this {
    this.versions.push(mf.toVersionResult());
    return this;
  }

  withVersions(versions: VersionResult[]): this {
    this.versions = versions;
    return this;
  }

  async search(_query: string, _page: number): Promise<ModResult[]> {
    return [];
  }

  async find(_slug: string): Promise<ModResult | undefined> {
    return undefined;
  }

  async getVersions(
    _projectId: string,
    gameVersions: string[],
    _loaders: string[],
  ): Promise<VersionResult[]> {
    return this.versions.filter((v) =>
      v.minecraftVersions.some((mc) => gameVersions.includes(mc)),
    );
  }
}
