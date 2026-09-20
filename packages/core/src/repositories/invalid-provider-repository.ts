import type {IRepository} from "./repository.interface.js";
import type {ModResult, VersionResult} from "../models/repository.js";
import type {IO} from "../io/io.types.js";

/** Stand-in repository registered for a misconfigured provider, so dispatch always finds
 * something at that id instead of falling through to undefined/a wrong-provider default. */
export class InvalidProviderRepository implements IRepository {
  readonly supportsDiscovery = false;

  constructor(
    private readonly id: string,
    private readonly reason: string,
    private readonly io: IO,
  ) {}

  async search(): Promise<ModResult[]> {
    this.warn();
    return [];
  }

  async find(): Promise<ModResult | undefined> {
    this.warn();
    return undefined;
  }

  async getVersions(): Promise<VersionResult[]> {
    this.warn();
    return [];
  }

  private warn(): void {
    this.io.warn(`Provider '${this.id}' is not usable: ${this.reason}`);
  }
}
