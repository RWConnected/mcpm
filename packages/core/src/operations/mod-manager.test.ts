import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { readFileSync } from "fs";
import {
  TestContext, ModFactory, ManifestFactory, LockfileFactory,
  FakeDownloadService,
} from "../testing/index.js";
import { ModManager } from "./mod-manager.js";

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
});
