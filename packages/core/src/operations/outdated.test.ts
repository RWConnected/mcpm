import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  TestContext, ModFactory, ManifestFactory, LockfileFactory,
  FakeRepository, FakeDownloadService,
} from "../testing/index.js";
import { ModManager } from "./mod-manager.js";
import { Outdated } from "./outdated.js";
import { RepositoryService } from "../repositories/repository-service.js";

function createManager(ctx: TestContext, repo: FakeRepository): ModManager {
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

describe("Outdated", () => {
  let ctx: TestContext;

  beforeEach(() => { ctx = new TestContext(); });
  afterEach(() => { ctx.cleanup(); });

  it("identifies outdated mods", async () => {
    const v1 = ModFactory.create("modrinth:sodium", "1.0.0");
    const v2 = ModFactory.create("modrinth:sodium", "1.1.0");

    ManifestFactory.create("1.21.11").withMod(v1).writeTo(ctx.paths);
    LockfileFactory.create().withMod(v1).writeTo(ctx.paths);

    const repo = new FakeRepository().withVersion(v1).withVersion(v2);
    const manager = createManager(ctx, repo);
    await manager.load();

    // Set as range so "wanted" can differ
    manager.manifestService.manifest.mods.set("modrinth:sodium", { kind: "range", value: "^1.0.0" });

    const result = await Outdated.run(manager, []);

    expect(result.totalChecked).toBe(1);
    expect(result.outdated).toHaveLength(1);
    expect(result.outdated[0].key).toBe("modrinth:sodium");
    expect(result.outdated[0].current).toBe("1.0.0");
  });

  it("reports empty when all mods are up to date", async () => {
    const mod = ModFactory.create("modrinth:sodium", "1.0.0");

    ManifestFactory.create("1.21.11").withMod(mod).writeTo(ctx.paths);
    LockfileFactory.create().withMod(mod).writeTo(ctx.paths);

    // Repo only has the same version
    const repo = new FakeRepository().withVersion(mod);
    const manager = createManager(ctx, repo);
    await manager.load();

    const result = await Outdated.run(manager, []);

    expect(result.totalChecked).toBe(1);
    expect(result.outdated).toHaveLength(0);
  });

  it("filters by mod name when specified", async () => {
    const modA = ModFactory.create("modrinth:sodium", "1.0.0");
    const modB = ModFactory.create("modrinth:lithium", "1.0.0");
    const modA2 = ModFactory.create("modrinth:sodium", "2.0.0");

    ManifestFactory.create("1.21.11").withMod(modA).withMod(modB).writeTo(ctx.paths);
    LockfileFactory.create().withMod(modA).withMod(modB).writeTo(ctx.paths);

    const repo = new FakeRepository()
      .withVersion(modA).withVersion(modA2).withVersion(modB);
    const manager = createManager(ctx, repo);
    await manager.load();
    manager.manifestService.manifest.mods.set("modrinth:sodium", { kind: "range", value: "^1.0.0" });

    const result = await Outdated.run(manager, ["sodium"]);

    expect(result.totalChecked).toBe(1); // only checked sodium
  });
});
