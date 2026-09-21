import {afterEach, beforeEach, describe, expect, it} from "bun:test";
import {existsSync} from "fs";
import {join} from "path";
import {FakeDownloadService, LockfileFactory, ManifestFactory, TestContext} from "../testing/index.js";
import {ModManager} from "./mod-manager.js";
import {ProviderInit} from "./provider-init.js";
import {validateProviders} from "../models/provider-config.js";

function createManager(ctx: TestContext): ModManager {
  return new ModManager({
    config: ctx.config,
    paths: ctx.paths,
    io: ctx.io,
    downloadService: new FakeDownloadService(),
  });
}

describe("ProviderInit", () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = new TestContext();
    ManifestFactory.create("1.21.11").writeTo(ctx.paths);
    LockfileFactory.create().writeTo(ctx.paths);
  });
  afterEach(() => { ctx.cleanup(); });

  it("scaffolds a vanillatweaks provider with empty datapacks/craftingtweaks/resourcepacks maps", async () => {
    const manager = createManager(ctx);
    await manager.load();

    const config = ProviderInit.run(manager, { id: "vt1", type: "vanillatweaks" });

    expect(config).toEqual({ id: "vt1", type: "vanillatweaks", datapacks: {}, craftingtweaks: {}, resourcepacks: {} });
    expect(manager.manifestService.manifest.providers).toContainEqual(config);
    // valid shape-wise, but empty bundles still flag as needing content
    const { invalid } = validateProviders(manager.manifestService.manifest.providers);
    expect(invalid).toHaveLength(1);
  });

  it("scaffolds a local provider with a default basePath and creates the directory", async () => {
    const manager = createManager(ctx);
    await manager.load();

    const config = ProviderInit.run(manager, { id: "local1", type: "local" });

    expect(config).toEqual({ id: "local1", type: "local", basePath: "./local-mods" });
    expect(existsSync(join(ctx.config.projectDir, "local-mods"))).toBe(true);
  });

  it("scaffolds a local provider with a custom path", async () => {
    const manager = createManager(ctx);
    await manager.load();

    const config = ProviderInit.run(manager, { id: "local1", type: "local", path: "./addons/tools" });

    expect(config).toEqual({ id: "local1", type: "local", basePath: "./addons/tools" });
    expect(existsSync(join(ctx.config.projectDir, "addons", "tools"))).toBe(true);
  });

  it("scaffolds a url provider with a placeholder template when none is given", async () => {
    const manager = createManager(ctx);
    await manager.load();

    const config = ProviderInit.run(manager, { id: "url1", type: "url" });

    expect(config).toEqual({
      id: "url1",
      type: "url",
      urlTemplate: "https://example.com/{slug}/{version}.jar",
    });
  });

  it("scaffolds a github provider with empty owner/repo when omitted, flagged invalid until filled", async () => {
    const manager = createManager(ctx);
    await manager.load();

    const config = ProviderInit.run(manager, { id: "gh1", type: "github" });

    expect(config).toEqual({ id: "gh1", type: "github", owner: "", repo: "" });
    const { invalid } = validateProviders(manager.manifestService.manifest.providers);
    expect(invalid).toHaveLength(1);
    expect(invalid[0]?.reason).toContain("missing owner");
  });

  it("scaffolds a github provider fully when owner/repo are given", async () => {
    const manager = createManager(ctx);
    await manager.load();

    const config = ProviderInit.run(manager, { id: "gh1", type: "github", owner: "rickiewars", repo: "gui-shop" });

    expect(config).toEqual({ id: "gh1", type: "github", owner: "rickiewars", repo: "gui-shop" });
    const { valid, invalid } = validateProviders(manager.manifestService.manifest.providers);
    expect(valid).toHaveLength(1);
    expect(invalid).toHaveLength(0);
  });

  it("scaffolds a gitlab provider, including an optional host", async () => {
    const manager = createManager(ctx);
    await manager.load();

    const config = ProviderInit.run(manager, {
      id: "gl1", type: "gitlab", owner: "rickiewars", repo: "gui-shop", host: "gitlab.example.com",
    });

    expect(config).toEqual({
      id: "gl1", type: "gitlab", owner: "rickiewars", repo: "gui-shop", host: "gitlab.example.com",
    });
  });

  it("persists the new provider to disk", async () => {
    const manager = createManager(ctx);
    await manager.load();

    ProviderInit.run(manager, { id: "url1", type: "url" });
    manager.manifestService.load();

    expect(manager.manifestService.manifest.providers?.some((p) => p.id === "url1")).toBe(true);
  });

  it("throws on a reserved id", async () => {
    const manager = createManager(ctx);
    await manager.load();

    expect(() => ProviderInit.run(manager, { id: "modrinth", type: "url" })).toThrow("reserved");
  });

  it("throws on a duplicate id", async () => {
    const manager = createManager(ctx);
    await manager.load();

    ProviderInit.run(manager, { id: "dup", type: "local" });
    expect(() => ProviderInit.run(manager, { id: "dup", type: "url" })).toThrow("already exists");
  });
});
