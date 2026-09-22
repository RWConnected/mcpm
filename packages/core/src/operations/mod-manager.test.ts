import {afterEach, beforeEach, describe, expect, it} from "bun:test";
import {readFileSync} from "fs";
import {
  FakeDownloadService,
  FakeRepository,
  LockfileFactory,
  ManifestFactory,
  ModFactory,
  TestContext,
} from "../testing/index.js";
import {ModManager} from "./mod-manager.js";
import {RepositoryService} from "../repositories/repository-service.js";

function createManager(ctx: TestContext): ModManager {
  return new ModManager({
    config: ctx.config,
    paths: ctx.paths,
    io: ctx.io,
    downloadService: new FakeDownloadService(),
  });
}

describe("ModManager", () => {
  let ctx: TestContext;

  beforeEach(() => { ctx = new TestContext(); });
  afterEach(() => { ctx.cleanup(); });

  // Ported from manager_spec.rs: lockfile_mods_are_sorted_by_name
  it("lockfile mods are sorted by name after save", async () => {
    const mods = [
      ModFactory.create("modrinth:z-mod", "1.0.0"),
      ModFactory.create("modrinth:a-mod", "1.0.0"),
      ModFactory.create("modrinth:m-mod", "1.0.0"),
    ];

    ManifestFactory.create("1.21.11").withMods(mods).writeTo(ctx.paths);
    LockfileFactory.create().withMods(mods).writeTo(ctx.paths);

    const manager = createManager(ctx);
    await manager.load();
    manager.saveAll();

    const lock = readFileSync(ctx.paths.lockPath, "utf-8");
    const aPos = lock.indexOf("modrinth:a-mod");
    const mPos = lock.indexOf("modrinth:m-mod");
    const zPos = lock.indexOf("modrinth:z-mod");

    expect(aPos).toBeLessThan(mPos);
    expect(mPos).toBeLessThan(zPos);
  });

  // Ported from manager_spec.rs: manifest_mod_order_is_preserved
  it("manifest mod order is preserved after save", async () => {
    const mods = [
      ModFactory.create("modrinth:z-mod", "1.0.0"),
      ModFactory.create("modrinth:a-mod", "1.0.0"),
      ModFactory.create("modrinth:m-mod", "1.0.0"),
      ModFactory.create("modrinth:i-mod", "1.0.0"),
    ];

    ManifestFactory.create("1.21.11").withMods(mods).writeTo(ctx.paths);
    LockfileFactory.create().withMods(mods).writeTo(ctx.paths);

    const manager = createManager(ctx);
    await manager.load();
    manager.saveAll();

    const manifest = readFileSync(ctx.paths.manifestPath, "utf-8");
    const zPos = manifest.indexOf("modrinth:z-mod");
    const aPos = manifest.indexOf("modrinth:a-mod");
    const mPos = manifest.indexOf("modrinth:m-mod");
    const iPos = manifest.indexOf("modrinth:i-mod");

    expect(zPos).toBeLessThan(aPos);
    expect(aPos).toBeLessThan(mPos);
    expect(mPos).toBeLessThan(iPos);
  });

  // Regression: a disabled entry with no compatible version must not abort install/upgrade —
  // that's often *why* it's disabled. Mirrors the handling already in upgrade.ts.
  it("refreshMod does not throw for a disabled entry that fails to resolve", async () => {
    const mod = ModFactory.create("modrinth:sodium", "1.0.0").forMcVersions(["1.20.0"]);
    ManifestFactory.create("1.21.11").withMod(mod).writeTo(ctx.paths);
    LockfileFactory.create().writeTo(ctx.paths);

    const repoService = new RepositoryService();
    repoService.addProvider("modrinth", new FakeRepository().withVersion(mod));

    const manager = new ModManager({
      config: ctx.config,
      paths: ctx.paths,
      io: ctx.io,
      downloadService: new FakeDownloadService(),
      repositoryService: repoService,
    });
    await manager.load();

    // Disable it directly on the loaded manifest, as `Disable.run` would.
    const spec = manager.manifestService.manifest.mods.get("modrinth:sodium")!;
    manager.manifestService.manifest.mods.delete("modrinth:sodium");
    manager.manifestService.manifest.mods.set("disabled:modrinth:sodium", spec);

    const [entry] = manager.manifestEntries("mod");
    expect(entry?.disabled).toBe(true);

    await expect(manager.refreshMod(entry!, undefined, false, false, "mod")).resolves.toBeUndefined();
  });

  it("refreshMod still throws for a non-disabled entry that fails to resolve", async () => {
    const mod = ModFactory.create("modrinth:sodium", "1.0.0").forMcVersions(["1.20.0"]);
    ManifestFactory.create("1.21.11").withMod(mod).writeTo(ctx.paths);
    LockfileFactory.create().writeTo(ctx.paths);

    const repoService = new RepositoryService();
    repoService.addProvider("modrinth", new FakeRepository().withVersion(mod));

    const manager = new ModManager({
      config: ctx.config,
      paths: ctx.paths,
      io: ctx.io,
      downloadService: new FakeDownloadService(),
      repositoryService: repoService,
    });
    await manager.load();

    const [entry] = manager.manifestEntries("mod");
    expect(entry?.disabled).toBeFalsy();

    await expect(manager.refreshMod(entry!, undefined, false, false, "mod")).rejects.toThrow("Failed to update");
  });
});
