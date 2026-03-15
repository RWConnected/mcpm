import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  TestContext, ModFactory, ManifestFactory, LockfileFactory,
  FakeRepository, FakeDownloadService,
} from "../testing/index.js";
import { ModManager } from "./mod-manager.js";
import { Upgrade } from "./upgrade.js";
import { RepositoryService } from "../repositories/repository-service.js";

function createManager(ctx: TestContext, repo: FakeRepository, dl: FakeDownloadService): ModManager {
  const repoService = new RepositoryService();
  repoService.addProvider("modrinth", repo);
  return new ModManager({
    config: ctx.config,
    paths: ctx.paths,
    io: ctx.io,
    downloadService: dl,
    repositoryService: repoService,
  });
}

describe("Upgrade", () => {
  let ctx: TestContext;

  beforeEach(() => { ctx = new TestContext(); });
  afterEach(() => { ctx.cleanup(); });

  // Ported from upgrade_spec.rs: upgrade_does_not_upgrade_pinned_mod_versions
  it("does not upgrade pinned (exact) mod versions", async () => {
    const modId = "modrinth:rwc-gui-shop";
    const initial = ModFactory.create(modId, "2.0.0+1.21.5");
    const other = ModFactory.create(modId, "2.0.1+1.21.11");

    const repo = new FakeRepository().withVersion(initial).withVersion(other);
    const dl = new FakeDownloadService().withMod(initial).withMod(other);
    const manager = createManager(ctx, repo, dl);

    ManifestFactory.create("1.21.11").withMod(initial).writeTo(ctx.paths);
    LockfileFactory.create().withMod(initial).writeTo(ctx.paths);
    await manager.load();

    const result = await Upgrade.runWithManager(manager, [], false);

    expect(result.upgraded).toHaveLength(0);
  });

  // Ported from upgrade_spec.rs: upgrade_ignores_version_constrains_when_told_to
  it("ignores version constraints when told to", async () => {
    const modId = "modrinth:rwc-gui-shop";
    const initial = ModFactory.create(modId, "2.0.0+1.21.5").forMcVersions(["1.21.5"]);
    const desired = ModFactory.create(modId, "2.0.1+1.21.11").forMcVersions(["1.21.11"]);

    const repo = new FakeRepository().withVersion(initial).withVersion(desired);
    const dl = new FakeDownloadService().withMod(initial).withMod(desired);
    const manager = createManager(ctx, repo, dl);

    ManifestFactory.create("1.21.11").withMod(initial).writeTo(ctx.paths);
    LockfileFactory.create().withMod(initial).writeTo(ctx.paths);
    await manager.load();

    const result = await Upgrade.runWithManager(manager, [], true);

    expect(result.upgraded).toHaveLength(1);

    const [, before, after] = result.upgraded[0];
    expect(before).toBe(initial.version);
    expect(after).toBe(desired.version);
  });
});
