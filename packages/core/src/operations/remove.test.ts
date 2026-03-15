import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  TestContext, ModFactory, ManifestFactory, LockfileFactory,
  FakeDownloadService,
} from "../testing/index.js";
import { ModManager } from "./mod-manager.js";
import { Remove } from "./remove.js";

function createManager(ctx: TestContext): ModManager {
  return new ModManager({
    config: ctx.config,
    paths: ctx.paths,
    io: ctx.io,
    downloadService: new FakeDownloadService(),
  });
}

describe("Remove", () => {
  let ctx: TestContext;

  beforeEach(() => { ctx = new TestContext(); });
  afterEach(() => { ctx.cleanup(); });

  it("removes mod from manifest and lockfile", async () => {
    const mod = ModFactory.create("modrinth:sodium", "0.6.0");
    ManifestFactory.create("1.21.11").withMod(mod).writeTo(ctx.paths);
    LockfileFactory.create().withMod(mod).writeTo(ctx.paths);

    const manager = createManager(ctx);
    await manager.load();

    const warning = await Remove.run(manager, "sodium");

    expect(warning).toBeUndefined();
    expect(manager.manifestService.manifest.mods.has("modrinth:sodium")).toBe(false);
    expect(manager.lockService.lock.mods.has("modrinth:sodium")).toBe(false);
  });

  it("returns warning for non-existent mod", async () => {
    ManifestFactory.create("1.21.11").writeTo(ctx.paths);
    LockfileFactory.create().writeTo(ctx.paths);

    const manager = createManager(ctx);
    await manager.load();

    const warning = await Remove.run(manager, "nonexistent");

    expect(warning).toBeDefined();
    expect(warning).toContain("not found");
  });

  it("uses explicit provider when given", async () => {
    const mod = ModFactory.create("curseforge:jei", "1.0.0");
    ManifestFactory.create("1.21.11").withMod(mod).writeTo(ctx.paths);
    LockfileFactory.create().withMod(mod).writeTo(ctx.paths);

    const manager = createManager(ctx);
    await manager.load();

    // Without provider, uses default (modrinth) — won't find it
    const warning1 = await Remove.run(manager, "jei");
    expect(warning1).toBeDefined();

    // With correct provider — finds it
    const warning2 = await Remove.run(manager, "jei", "curseforge");
    expect(warning2).toBeUndefined();
    expect(manager.manifestService.manifest.mods.has("curseforge:jei")).toBe(false);
  });

  it("persists changes to disk after removal", async () => {
    const modA = ModFactory.create("modrinth:a", "1.0.0");
    const modB = ModFactory.create("modrinth:b", "1.0.0");
    ManifestFactory.create("1.21.11").withMod(modA).withMod(modB).writeTo(ctx.paths);
    LockfileFactory.create().withMod(modA).withMod(modB).writeTo(ctx.paths);

    const manager = createManager(ctx);
    await manager.load();

    await Remove.run(manager, "a");

    // Reload from disk to verify persistence
    manager.manifestService.load();
    manager.lockService.load();

    expect(manager.manifestService.manifest.mods.has("modrinth:a")).toBe(false);
    expect(manager.manifestService.manifest.mods.has("modrinth:b")).toBe(true);
    expect(manager.lockService.lock.mods.has("modrinth:a")).toBe(false);
    expect(manager.lockService.lock.mods.has("modrinth:b")).toBe(true);
  });
});
