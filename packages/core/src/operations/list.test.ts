import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  TestContext, ModFactory, ManifestFactory, LockfileFactory,
  FakeDownloadService,
} from "../testing/index.js";
import { ModManager } from "./mod-manager.js";
import { List } from "./list.js";

function createManager(ctx: TestContext): ModManager {
  return new ModManager({
    config: ctx.config,
    paths: ctx.paths,
    io: ctx.io,
    downloadService: new FakeDownloadService(),
  });
}

describe("List", () => {
  let ctx: TestContext;

  beforeEach(() => { ctx = new TestContext(); });
  afterEach(() => { ctx.cleanup(); });

  it("shows 'no mods' for empty manifest", async () => {
    ManifestFactory.create("1.21.11").writeTo(ctx.paths);
    LockfileFactory.create().writeTo(ctx.paths);

    const manager = createManager(ctx);
    await manager.load();

    await List.run(manager);

    const msgs = ctx.io.messages.map((m) => m.msg);
    expect(msgs.some((m) => m.includes("No mods"))).toBe(true);
  });

  it("lists all mods with provider:slug format", async () => {
    const modA = ModFactory.create("modrinth:sodium", "0.6.0");
    const modB = ModFactory.create("modrinth:lithium", "1.0.0");
    ManifestFactory.create("1.21.11").withMod(modA).withMod(modB).writeTo(ctx.paths);
    LockfileFactory.create().writeTo(ctx.paths);

    const manager = createManager(ctx);
    await manager.load();

    await List.run(manager);

    const prints = ctx.io.messages.filter((m) => m.level === "print").map((m) => m.msg);
    expect(prints.some((m) => m.includes("modrinth:sodium"))).toBe(true);
    expect(prints.some((m) => m.includes("modrinth:lithium"))).toBe(true);
  });
});
