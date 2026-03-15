import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { TestContext } from "./test-context.js";
import { QuietIO } from "./quiet-io.js";
import { ModFactory } from "./mod-factory.js";
import { ManifestFactory } from "./manifest-factory.js";
import { LockfileFactory } from "./lockfile-factory.js";
import { FakeRepository } from "./fake-repository.js";
import { FakeDownloadService } from "./fake-download-service.js";

describe("TestContext", () => {
  let ctx: TestContext;

  beforeEach(() => { ctx = new TestContext(); });
  afterEach(() => { ctx.cleanup(); });

  it("creates temp directories", () => {
    expect(existsSync(ctx.root)).toBe(true);
    expect(existsSync(ctx.config.cacheDir)).toBe(true);
    expect(existsSync(ctx.config.modsDir)).toBe(true);
  });

  it("provides correct config paths", () => {
    expect(ctx.paths.manifestPath).toBe(join(ctx.root, "mcpm.json"));
    expect(ctx.paths.lockPath).toBe(join(ctx.root, "mcpm.lock"));
  });

  it("cleanup removes temp directory", () => {
    const root = ctx.root;
    ctx.cleanup();
    expect(existsSync(root)).toBe(false);
  });
});

describe("QuietIO", () => {
  it("captures messages", () => {
    const io = new QuietIO();
    io.info("test message");
    io.error("error msg");
    expect(io.messages).toHaveLength(2);
    expect(io.messages[0].level).toBe("info");
    expect(io.messages[1].level).toBe("error");
  });
});

describe("ModFactory", () => {
  let ctx: TestContext;

  beforeEach(() => { ctx = new TestContext(); });
  afterEach(() => { ctx.cleanup(); });

  it("creates mod with sensible defaults", () => {
    const mod = ModFactory.create("modrinth:sodium", "0.6.0");
    expect(mod.id).toBe("modrinth:sodium");
    expect(mod.version).toBe("0.6.0");
    expect(mod.minecraftVersions).toEqual(["1.21.11"]);
    expect(mod.filename).toBe("modrinth:sodium-0.6.0.jar");
    expect(mod.hash).toBeTruthy();
  });

  it("produces deterministic hash", () => {
    const a = ModFactory.create("modrinth:test", "1.0.0");
    const b = ModFactory.create("modrinth:test", "1.0.0");
    expect(a.hash).toBe(b.hash);
  });

  it("different content produces different hash", () => {
    const a = ModFactory.create("modrinth:test", "1.0.0");
    const b = ModFactory.create("modrinth:test", "2.0.0");
    expect(a.hash).not.toBe(b.hash);
  });

  it("seeds cache file", () => {
    const mod = ModFactory.create("modrinth:test", "1.0.0");
    mod.seedCache(ctx.config);
    expect(existsSync(join(ctx.config.cacheDir, mod.filename))).toBe(true);
  });

  it("seeds mod file", () => {
    const mod = ModFactory.create("modrinth:test", "1.0.0");
    mod.seedMod(ctx.config);
    expect(existsSync(join(ctx.config.modsDir, mod.filename))).toBe(true);
  });

  it("converts to VersionResult", () => {
    const mod = ModFactory.create("modrinth:test", "1.0.0");
    const vr = mod.toVersionResult();
    expect(vr.modId).toBe("modrinth:test");
    expect(vr.version).toBe("1.0.0");
    expect(vr.hash).toBe(mod.hash);
  });
});

describe("ManifestFactory", () => {
  let ctx: TestContext;

  beforeEach(() => { ctx = new TestContext(); });
  afterEach(() => { ctx.cleanup(); });

  it("writes valid manifest JSON", () => {
    const mod = ModFactory.create("modrinth:sodium", "0.6.0");
    ManifestFactory.create("1.21.11").withMod(mod).writeTo(ctx.paths);

    const content = JSON.parse(readFileSync(ctx.paths.manifestPath, "utf-8"));
    expect(content.name).toBe("Pack");
    expect(content.minecraft_version).toBe("1.21.11");
    expect(content.mods["modrinth:sodium"]).toBe("0.6.0");
  });
});

describe("LockfileFactory", () => {
  let ctx: TestContext;

  beforeEach(() => { ctx = new TestContext(); });
  afterEach(() => { ctx.cleanup(); });

  it("writes valid lockfile JSON", () => {
    const mod = ModFactory.create("modrinth:sodium", "0.6.0");
    LockfileFactory.create().withMod(mod).writeTo(ctx.paths);

    const content = JSON.parse(readFileSync(ctx.paths.lockPath, "utf-8"));
    expect(content.mods["modrinth:sodium"]).toBeDefined();
    expect(content.mods["modrinth:sodium"].version).toBe("0.6.0");
    expect(content.mods["modrinth:sodium"].hash).toBe(mod.hash);
  });
});

describe("FakeRepository", () => {
  it("filters versions by minecraft version", async () => {
    const v1 = ModFactory.create("test", "1.0.0").forMcVersions(["1.21.11"]);
    const v2 = ModFactory.create("test", "2.0.0").forMcVersions(["1.20.1"]);

    const repo = new FakeRepository().withVersion(v1).withVersion(v2);

    const results = await repo.getVersions("test", ["1.21.11"], ["fabric"]);
    expect(results).toHaveLength(1);
    expect(results[0].version).toBe("1.0.0");
  });
});

describe("FakeDownloadService", () => {
  let ctx: TestContext;

  beforeEach(() => { ctx = new TestContext(); });
  afterEach(() => { ctx.cleanup(); });

  it("downloads with correct hash", async () => {
    const mod = ModFactory.create("modrinth:test", "1.0.0");
    const service = new FakeDownloadService().withMod(mod);

    const dest = join(ctx.config.cacheDir, mod.filename);
    await service.download(mod.url, dest, mod.hash);
    expect(existsSync(dest)).toBe(true);
  });

  it("throws on hash mismatch", async () => {
    const mod = ModFactory.create("modrinth:test", "1.0.0");
    const service = new FakeDownloadService().withMod(mod);

    const dest = join(ctx.config.cacheDir, mod.filename);
    await expect(service.download(mod.url, dest, "wrong-hash")).rejects.toThrow("Hash mismatch");
  });
});
