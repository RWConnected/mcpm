import {afterEach, beforeEach, describe, expect, it} from "bun:test";
import {
  FakeDownloadService,
  FakeRepository,
  LockfileFactory,
  ManifestFactory,
  ModFactory,
  TestContext,
} from "../testing/index.js";
import {ModManager} from "./mod-manager.js";
import {Add} from "./add.js";
import {RepositoryService} from "../repositories/repository-service.js";
import type {ModResult} from "../models/repository.js";

function createManager(
  ctx: TestContext,
  repo: FakeRepository,
): ModManager {
  const repoService = new RepositoryService();
  repoService.addProvider("modrinth", repo);
  return new ModManager({
    config: ctx.config,
    paths: ctx.paths,
    io: ctx.io,
    downloadService: new FakeDownloadService(),
    repositoryService: repoService,
  });
}

// FakeRepository that also returns a find result
class FindableFakeRepository extends FakeRepository {
  private findResult: ModResult | undefined;

  withFindResult(result: ModResult): this {
    this.findResult = result;
    return this;
  }

  override async find(_slug: string): Promise<ModResult | undefined> {
    return this.findResult;
  }
}

// FakeRepository representing a provider with no discovery API (local/url/git-release)
class NoDiscoveryFakeRepository extends FakeRepository {
  override readonly supportsDiscovery = false;
  findWasCalled = false;

  override async find(_slug: string): Promise<ModResult | undefined> {
    this.findWasCalled = true;
    return undefined;
  }
}

describe("Add", () => {
  let ctx: TestContext;

  beforeEach(() => { ctx = new TestContext(); });
  afterEach(() => { ctx.cleanup(); });

  it("adds a mod to manifest and lockfile", async () => {
    const mod = ModFactory.create("modrinth:sodium", "0.6.0");
    ManifestFactory.create("1.21.11").writeTo(ctx.paths);
    LockfileFactory.create().writeTo(ctx.paths);

    const repo = new FindableFakeRepository()
      .withVersion(mod)
      .withFindResult({
        id: "sodium",
        slug: "sodium",
        name: "Sodium",
        description: "Performance mod",
        source: "Modrinth",
        side: "client",
        url: "https://modrinth.com/mod/sodium",
      });

    const manager = createManager(ctx, repo);

    await Add.run(manager, {
      id: "sodium",
      search: false,
      exact: false,
    });

    expect(manager.manifestService.manifest.mods.has("modrinth:sodium")).toBe(true);
    expect(manager.lockService.lock.mods.has("modrinth:sodium")).toBe(true);
  });

  it("uses exact version spec when exact flag is set", async () => {
    const mod = ModFactory.create("modrinth:sodium", "0.6.0");
    ManifestFactory.create("1.21.11").writeTo(ctx.paths);
    LockfileFactory.create().writeTo(ctx.paths);

    const repo = new FindableFakeRepository()
      .withVersion(mod)
      .withFindResult({
        id: "sodium", slug: "sodium", name: "Sodium",
        description: "", source: "Modrinth", side: "client", url: "",
      });

    const manager = createManager(ctx, repo);

    await Add.run(manager, {
      id: "sodium",
      search: false,
      exact: true,
    });

    const spec = manager.manifestService.manifest.mods.get("modrinth:sodium");
    expect(spec?.kind).toBe("exact");
    expect(spec?.value).toBe("0.6.0");
  });

  it("uses range version spec by default", async () => {
    const mod = ModFactory.create("modrinth:sodium", "0.6.0");
    ManifestFactory.create("1.21.11").writeTo(ctx.paths);
    LockfileFactory.create().writeTo(ctx.paths);

    const repo = new FindableFakeRepository()
      .withVersion(mod)
      .withFindResult({
        id: "sodium", slug: "sodium", name: "Sodium",
        description: "", source: "Modrinth", side: "client", url: "",
      });

    const manager = createManager(ctx, repo);

    await Add.run(manager, {
      id: "sodium",
      search: false,
      exact: false,
    });

    const spec = manager.manifestService.manifest.mods.get("modrinth:sodium");
    expect(spec?.kind).toBe("range");
    expect(spec?.value).toBe("^0.6.0");
  });

  it("throws when mod not found on a discovery-capable provider", async () => {
    ManifestFactory.create("1.21.11").writeTo(ctx.paths);
    LockfileFactory.create().writeTo(ctx.paths);

    const repo = new FindableFakeRepository();
    const manager = createManager(ctx, repo);

    await expect(
      Add.run(manager, { id: "nonexistent", search: false, exact: false }),
    ).rejects.toThrow("No mod found");
  });

  it("throws when search finds nothing", async () => {
    ManifestFactory.create("1.21.11").writeTo(ctx.paths);
    LockfileFactory.create().writeTo(ctx.paths);

    const repo = new FindableFakeRepository();
    const manager = createManager(ctx, repo);

    await expect(
      Add.run(manager, { id: "nonexistent", search: true, exact: false }),
    ).rejects.toThrow("No mod found");
  });

  it("treats the id as an exact slug for a provider with no discovery, without calling find", async () => {
    const mod = ModFactory.create("gui-shop", "2.1.0");
    ManifestFactory.create("1.21.11").writeTo(ctx.paths);
    LockfileFactory.create().writeTo(ctx.paths);

    const repo = new NoDiscoveryFakeRepository().withVersion(mod);
    const manager = createManager(ctx, repo);

    await Add.run(manager, { id: "gui-shop", search: false, exact: true });

    expect(repo.findWasCalled).toBe(false);
    expect(manager.manifestService.manifest.mods.has("modrinth:gui-shop")).toBe(true);
  });
});
