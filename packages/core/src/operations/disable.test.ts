import {afterEach, beforeEach, describe, expect, it} from "bun:test";
import {FakeDownloadService, LockfileFactory, ManifestFactory, ModFactory, TestContext,} from "../testing/index.js";
import {ModManager} from "./mod-manager.js";
import {Disable} from "./disable.js";
import {modsAsEntries} from "../models/manifest.js";

function createManager(ctx: TestContext): ModManager {
  return new ModManager({
    config: ctx.config,
    paths: ctx.paths,
    io: ctx.io,
    downloadService: new FakeDownloadService(),
  });
}

describe("Disable", () => {
  let ctx: TestContext;

  beforeEach(() => { ctx = new TestContext(); });
  afterEach(() => { ctx.cleanup(); });

  it("marks mod as disabled in manifest, keeps it in lockfile", async () => {
    const mod = ModFactory.create("modrinth:sodium", "0.6.0");
    ManifestFactory.create("1.21.11").withMod(mod).writeTo(ctx.paths);
    LockfileFactory.create().withMod(mod).writeTo(ctx.paths);

    const manager = createManager(ctx);
    await manager.load();

    const outcome = await Disable.run(manager, "sodium");

    expect(outcome).toBe("disabled");
    expect(manager.manifestService.manifest.mods.has("modrinth:sodium")).toBe(false);
    expect(manager.manifestService.manifest.mods.has("disabled:modrinth:sodium")).toBe(true);
    expect(manager.lockService.lock.mods.has("modrinth:sodium")).toBe(true);

    const entries = modsAsEntries(manager.manifestService.manifest);
    expect(entries[0].disabled).toBe(true);
  });

  it("returns not-found for non-existent mod", async () => {
    ManifestFactory.create("1.21.11").writeTo(ctx.paths);
    LockfileFactory.create().writeTo(ctx.paths);

    const manager = createManager(ctx);
    await manager.load();

    const outcome = await Disable.run(manager, "nonexistent");

    expect(outcome).toBe("not-found");
  });

  it("returns already-disabled when disabling twice", async () => {
    const mod = ModFactory.create("modrinth:sodium", "0.6.0");
    ManifestFactory.create("1.21.11").withMod(mod).writeTo(ctx.paths);
    LockfileFactory.create().withMod(mod).writeTo(ctx.paths);

    const manager = createManager(ctx);
    await manager.load();

    await Disable.run(manager, "sodium");
    const outcome = await Disable.run(manager, "sodium");

    expect(outcome).toBe("already-disabled");
  });

  it("persists disabled state to disk", async () => {
    const mod = ModFactory.create("modrinth:sodium", "0.6.0");
    ManifestFactory.create("1.21.11").withMod(mod).writeTo(ctx.paths);
    LockfileFactory.create().withMod(mod).writeTo(ctx.paths);

    const manager = createManager(ctx);
    await manager.load();

    await Disable.run(manager, "sodium");

    manager.manifestService.load();
    expect(manager.manifestService.manifest.mods.has("disabled:modrinth:sodium")).toBe(true);
  });
});
