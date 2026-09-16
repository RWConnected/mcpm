import {afterEach, beforeEach, describe, expect, it} from "bun:test";
import {FakeDownloadService, LockfileFactory, ManifestFactory, ModFactory, TestContext,} from "../testing/index.js";
import {ModManager} from "./mod-manager.js";
import {Disable} from "./disable.js";
import {Enable} from "./enable.js";

function createManager(ctx: TestContext): ModManager {
  return new ModManager({
    config: ctx.config,
    paths: ctx.paths,
    io: ctx.io,
    downloadService: new FakeDownloadService(),
  });
}

describe("Enable", () => {
  let ctx: TestContext;

  beforeEach(() => { ctx = new TestContext(); });
  afterEach(() => { ctx.cleanup(); });

  it("flips a disabled mod back to enabled", async () => {
    const mod = ModFactory.create("modrinth:sodium", "0.6.0");
    ManifestFactory.create("1.21.11").withMod(mod).writeTo(ctx.paths);
    LockfileFactory.create().withMod(mod).writeTo(ctx.paths);

    const manager = createManager(ctx);
    await manager.load();

    await Disable.run(manager, "sodium");
    const outcome = await Enable.run(manager, "sodium");

    expect(outcome).toBe("enabled");
    expect(manager.manifestService.manifest.mods.has("modrinth:sodium")).toBe(true);
    expect(manager.manifestService.manifest.mods.has("disabled:modrinth:sodium")).toBe(false);
  });

  it("returns not-found for non-existent mod", async () => {
    ManifestFactory.create("1.21.11").writeTo(ctx.paths);
    LockfileFactory.create().writeTo(ctx.paths);

    const manager = createManager(ctx);
    await manager.load();

    const outcome = await Enable.run(manager, "nonexistent");

    expect(outcome).toBe("not-found");
  });

  it("returns already-enabled when already enabled", async () => {
    const mod = ModFactory.create("modrinth:sodium", "0.6.0");
    ManifestFactory.create("1.21.11").withMod(mod).writeTo(ctx.paths);
    LockfileFactory.create().writeTo(ctx.paths);

    const manager = createManager(ctx);
    await manager.load();

    const outcome = await Enable.run(manager, "sodium");

    expect(outcome).toBe("already-enabled");
  });
});
