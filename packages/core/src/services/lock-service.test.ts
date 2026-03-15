import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { readFileSync } from "fs";
import {
  TestContext, ModFactory, ManifestFactory, LockfileFactory, FakeRepository,
} from "../testing/index.js";
import { ManifestService } from "./manifest-service.js";
import { LockService } from "./lock-service.js";
import { RepositoryService } from "../repositories/repository-service.js";

describe("LockService", () => {
  let ctx: TestContext;

  beforeEach(() => { ctx = new TestContext(); });
  afterEach(() => { ctx.cleanup(); });

  describe("load", () => {
    it("loads a valid lockfile", () => {
      const mod = ModFactory.create("modrinth:sodium", "0.6.0");
      LockfileFactory.create().withMod(mod).writeTo(ctx.paths);

      const service = new LockService(ctx.paths, ctx.io);
      service.load();

      expect(service.lock.mods.size).toBe(1);
      expect(service.lock.mods.has("modrinth:sodium")).toBe(true);
      expect(service.lock.mods.get("modrinth:sodium")?.version).toBe("0.6.0");
    });

    it("returns empty lockfile when file does not exist", () => {
      const service = new LockService(ctx.paths, ctx.io);
      service.load();
      expect(service.lock.mods.size).toBe(0);
    });
  });

  describe("save", () => {
    it("sorts mods alphabetically by key", () => {
      const mods = [
        ModFactory.create("modrinth:z-mod", "1.0.0"),
        ModFactory.create("modrinth:a-mod", "1.0.0"),
        ModFactory.create("modrinth:m-mod", "1.0.0"),
      ];
      LockfileFactory.create().withMods(mods).writeTo(ctx.paths);

      const service = new LockService(ctx.paths, ctx.io);
      service.load();
      service.save();

      const raw = readFileSync(ctx.paths.lockPath, "utf-8");
      const aPos = raw.indexOf("modrinth:a-mod");
      const mPos = raw.indexOf("modrinth:m-mod");
      const zPos = raw.indexOf("modrinth:z-mod");

      expect(aPos).toBeLessThan(mPos);
      expect(mPos).toBeLessThan(zPos);
    });
  });

  describe("prune", () => {
    it("removes lockfile entries not in manifest", () => {
      const modA = ModFactory.create("modrinth:a", "1.0.0");
      const modB = ModFactory.create("modrinth:b", "1.0.0");

      ManifestFactory.create("1.21.11").withMod(modA).writeTo(ctx.paths);
      LockfileFactory.create().withMod(modA).withMod(modB).writeTo(ctx.paths);

      const manifestService = new ManifestService(ctx.paths, ctx.io);
      manifestService.load();

      const lockService = new LockService(ctx.paths, ctx.io);
      lockService.load();

      const removed = lockService.prune(manifestService.manifest);

      expect(removed.has("modrinth:b")).toBe(true);
      expect(lockService.lock.mods.has("modrinth:a")).toBe(true);
      expect(lockService.lock.mods.has("modrinth:b")).toBe(false);
    });
  });

  describe("updateEntry", () => {
    it("adds new entry to lockfile when version is outdated", async () => {
      const mod = ModFactory.create("modrinth:sodium", "0.6.0");
      ManifestFactory.create("1.21.11").withMod(mod).writeTo(ctx.paths);

      const manifestService = new ManifestService(ctx.paths, ctx.io);
      manifestService.load();

      const lockService = new LockService(ctx.paths, ctx.io);
      lockService.load();

      const repoService = new RepositoryService();
      repoService.addProvider("modrinth", new FakeRepository().withVersion(mod));

      const entry = { slug: "sodium", version: { kind: "exact" as const, value: "0.6.0" }, provider: "modrinth" as const };
      const success = await lockService.updateEntry(entry, manifestService.manifest, repoService, undefined, false, false);

      expect(success).toBe(true);
      expect(lockService.lock.mods.has("modrinth:sodium")).toBe(true);
      expect(lockService.lock.mods.get("modrinth:sodium")?.version).toBe("0.6.0");
    });

    it("skips when version satisfies spec and not upgrading", async () => {
      const mod = ModFactory.create("modrinth:sodium", "0.6.0");
      ManifestFactory.create("1.21.11").withMod(mod).writeTo(ctx.paths);
      LockfileFactory.create().withMod(mod).writeTo(ctx.paths);

      const manifestService = new ManifestService(ctx.paths, ctx.io);
      manifestService.load();

      const lockService = new LockService(ctx.paths, ctx.io);
      lockService.load();

      const repoService = new RepositoryService();

      const entry = { slug: "sodium", version: { kind: "exact" as const, value: "0.6.0" }, provider: "modrinth" as const };
      const success = await lockService.updateEntry(entry, manifestService.manifest, repoService, undefined, false, false);

      expect(success).toBe(true);
      // Should not have called repo (entry already satisfies)
    });

    it("updates manifest version spec on upgrade", async () => {
      const v1 = ModFactory.create("modrinth:sodium", "1.0.0");
      const v2 = ModFactory.create("modrinth:sodium", "1.1.0");

      ManifestFactory.create("1.21.11").withMod(v1).writeTo(ctx.paths);
      LockfileFactory.create().withMod(v1).writeTo(ctx.paths);

      const manifestService = new ManifestService(ctx.paths, ctx.io);
      manifestService.load();
      // Set as range so upgrade updates it
      manifestService.manifest.mods.set("modrinth:sodium", { kind: "range", value: "^1.0.0" });

      const lockService = new LockService(ctx.paths, ctx.io);
      lockService.load();

      const repoService = new RepositoryService();
      repoService.addProvider("modrinth", new FakeRepository().withVersion(v1).withVersion(v2));

      const entry = { slug: "sodium", version: { kind: "range" as const, value: "^1.0.0" }, provider: "modrinth" as const };
      await lockService.updateEntry(entry, manifestService.manifest, repoService, undefined, true, false);

      expect(lockService.lock.mods.get("modrinth:sodium")?.version).toBe("1.1.0");
      // Manifest version should be updated to ^1.1.0
      const updatedSpec = manifestService.manifest.mods.get("modrinth:sodium");
      expect(updatedSpec?.kind).toBe("range");
      expect(updatedSpec?.value).toBe("^1.1.0");
    });
  });

  describe("getVersion", () => {
    it("returns version from lock", () => {
      const mod = ModFactory.create("modrinth:sodium", "0.6.0");
      LockfileFactory.create().withMod(mod).writeTo(ctx.paths);

      const service = new LockService(ctx.paths, ctx.io);
      service.load();

      const entry = { slug: "sodium", version: { kind: "exact" as const, value: "0.6.0" }, provider: "modrinth" as const };
      expect(service.getVersion(entry)).toBe("0.6.0");
    });

    it("returns undefined for missing entry", () => {
      const service = new LockService(ctx.paths, ctx.io);
      service.load();

      const entry = { slug: "missing", version: { kind: "exact" as const, value: "1.0.0" }, provider: "modrinth" as const };
      expect(service.getVersion(entry)).toBeUndefined();
    });
  });
});
