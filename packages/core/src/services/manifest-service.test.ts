import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { TestContext, ManifestFactory, ModFactory } from "../testing/index.js";
import { ManifestService } from "./manifest-service.js";

describe("ManifestService", () => {
  let ctx: TestContext;

  beforeEach(() => { ctx = new TestContext(); });
  afterEach(() => { ctx.cleanup(); });

  describe("load", () => {
    it("loads a valid manifest file", () => {
      ManifestFactory.create("1.21.11")
        .withMod(ModFactory.create("modrinth:sodium", "0.6.0"))
        .writeTo(ctx.paths);

      const service = new ManifestService(ctx.paths, ctx.io);
      service.load();

      expect(service.manifest.minecraft_version).toBe("1.21.11");
      expect(service.manifest.mods.size).toBe(1);
      expect(service.manifest.mods.has("modrinth:sodium")).toBe(true);
    });

    it("fills missing fields with defaults", () => {
      writeFileSync(ctx.paths.manifestPath, JSON.stringify({ name: "Test" }));

      const service = new ManifestService(ctx.paths, ctx.io);
      service.load();

      expect(service.manifest.name).toBe("Test");
      expect(service.manifest.modloader).toBe("fabric"); // default
      expect(service.manifest.default_provider).toBe("modrinth"); // default
    });

    it("returns empty mods when file has no mods", () => {
      writeFileSync(ctx.paths.manifestPath, JSON.stringify({ name: "Empty" }));

      const service = new ManifestService(ctx.paths, ctx.io);
      service.load();

      expect(service.manifest.mods.size).toBe(0);
    });

    it("throws when file does not exist", () => {
      const service = new ManifestService(ctx.paths, ctx.io);
      expect(() => service.load()).toThrow();
    });
  });

  describe("save", () => {
    it("writes manifest to disk as pretty JSON", () => {
      ManifestFactory.create("1.21.11").writeTo(ctx.paths);

      const service = new ManifestService(ctx.paths, ctx.io);
      service.load();
      service.manifest.name = "Modified";
      service.save();

      const content = JSON.parse(readFileSync(ctx.paths.manifestPath, "utf-8"));
      expect(content.name).toBe("Modified");
    });

    it("preserves mod insertion order through round-trip", () => {
      const mods = [
        ModFactory.create("modrinth:z-mod", "1.0.0"),
        ModFactory.create("modrinth:a-mod", "1.0.0"),
        ModFactory.create("modrinth:m-mod", "1.0.0"),
        ModFactory.create("modrinth:i-mod", "1.0.0"),
      ];
      ManifestFactory.create("1.21.11").withMods(mods).writeTo(ctx.paths);

      const service = new ManifestService(ctx.paths, ctx.io);
      service.load();
      service.save();

      const raw = readFileSync(ctx.paths.manifestPath, "utf-8");
      const zPos = raw.indexOf("modrinth:z-mod");
      const aPos = raw.indexOf("modrinth:a-mod");
      const mPos = raw.indexOf("modrinth:m-mod");
      const iPos = raw.indexOf("modrinth:i-mod");

      expect(zPos).toBeLessThan(aPos);
      expect(aPos).toBeLessThan(mPos);
      expect(mPos).toBeLessThan(iPos);
    });
  });

  describe("init", () => {
    it("creates manifest when file does not exist", () => {
      const service = new ManifestService(ctx.paths, ctx.io);
      service.init();

      expect(existsSync(ctx.paths.manifestPath)).toBe(true);
      const content = JSON.parse(readFileSync(ctx.paths.manifestPath, "utf-8"));
      expect(content.name).toBeDefined();
    });

    it("creates gitignore with recommended entries", () => {
      const service = new ManifestService(ctx.paths, ctx.io);
      service.init();

      expect(existsSync(ctx.paths.gitignorePath)).toBe(true);
      const content = readFileSync(ctx.paths.gitignorePath, "utf-8");
      expect(content).toContain("mods/");
    });

    it("normalizes existing manifest", () => {
      // Write a partial manifest
      writeFileSync(ctx.paths.manifestPath, JSON.stringify({ name: "Partial" }));

      const service = new ManifestService(ctx.paths, ctx.io);
      service.init();

      // Should fill in defaults
      const content = JSON.parse(readFileSync(ctx.paths.manifestPath, "utf-8"));
      expect(content.name).toBe("Partial");
      expect(content.modloader).toBeDefined();
    });
  });
});
