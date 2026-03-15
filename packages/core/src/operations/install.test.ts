import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { existsSync } from "fs";
import { join } from "path";
import {
  TestContext, ModFactory, ManifestFactory, LockfileFactory,
  FakeRepository, FakeDownloadService,
} from "../testing/index.js";
import { ModManager } from "./mod-manager.js";
import { Install } from "./install.js";
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

describe("Install", () => {
  let ctx: TestContext;

  beforeEach(() => { ctx = new TestContext(); });
  afterEach(() => { ctx.cleanup(); });

  // Ported from install_spec.rs: install_removes_old_versions_when_package_updates
  it("removes old version files when package updates", async () => {
    const mcVersion = "1.21.11";
    const modId = "modrinth:mod";
    const v1 = ModFactory.create(modId, "1.0.0");
    const v2 = ModFactory.create(modId, "2.0.0");

    const repo = new FakeRepository().withVersion(v1).withVersion(v2);
    const dl = new FakeDownloadService().withMod(v1).withMod(v2);
    const manager = createManager(ctx, repo, dl);

    // Install v1
    LockfileFactory.create().withMod(v1).writeTo(ctx.paths);
    ManifestFactory.create(mcVersion).withMod(v1).writeTo(ctx.paths);
    await manager.load();

    await Install.runWithManager(manager, false, false);

    expect(existsSync(join(ctx.config.modsDir, v1.filename))).toBe(true);

    // Update to v2
    LockfileFactory.create().withMod(v2).writeTo(ctx.paths);
    ManifestFactory.create(mcVersion).withMod(v2).writeTo(ctx.paths);
    await manager.load();

    await Install.runWithManager(manager, false, false);

    expect(existsSync(join(ctx.config.modsDir, v2.filename))).toBe(true);
    expect(existsSync(join(ctx.config.modsDir, v1.filename))).toBe(false);
  });

  // Ported from install_spec.rs: install_removes_entries_not_in_manifest_from_lockfile_and_mods_folder
  it("removes entries not in manifest from lockfile and mods folder", async () => {
    const mcVersion = "1.21.11";
    const modA = ModFactory.create("modrinth:a", "1.0.0");
    const modB = ModFactory.create("modrinth:b", "1.0.0");
    modA.seedMod(ctx.config);
    modB.seedMod(ctx.config);

    const repo = new FakeRepository().withVersion(modA).withVersion(modB);
    const dl = new FakeDownloadService().withMod(modA).withMod(modB);
    const manager = createManager(ctx, repo, dl);

    // Lockfile has both mods, manifest only has mod_a
    LockfileFactory.create().withMod(modA).withMod(modB).writeTo(ctx.paths);
    ManifestFactory.create(mcVersion).withMod(modA).writeTo(ctx.paths);
    await manager.load();

    await Install.runWithManager(manager, false, false);

    // Reload to check disk state
    manager.lockService.load();

    expect(manager.lockService.lock.mods.has("modrinth:a")).toBe(true);
    expect(manager.lockService.lock.mods.has("modrinth:b")).toBe(false);

    expect(existsSync(join(ctx.config.modsDir, modA.filename))).toBe(true);
    expect(existsSync(join(ctx.config.modsDir, modB.filename))).toBe(false);
  });
});
