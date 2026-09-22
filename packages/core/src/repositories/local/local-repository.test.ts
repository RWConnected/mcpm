import {afterEach, beforeEach, describe, expect, it} from "bun:test";
import {existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from "fs";
import {join} from "path";
import {tmpdir} from "os";
import {createHash} from "crypto";
import {fileURLToPath} from "url";
import JSZip from "jszip";
import {LocalRepository} from "./local-repository.js";

describe("LocalRepository", () => {
  let root: string;
  let cacheDir: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "mcpm-local-repo-test-"));
    cacheDir = mkdtempSync(join(tmpdir(), "mcpm-local-repo-cache-"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
    rmSync(cacheDir, { recursive: true, force: true });
  });

  function writeJar(slug: string, fileName: string, content: string): string {
    const dir = join(root, "mods", slug);
    mkdirSync(dir, { recursive: true });
    const path = join(dir, fileName);
    writeFileSync(path, content);
    return createHash("sha512").update(content).digest("hex");
  }

  it("finds an exact wanted version and computes its hash", async () => {
    const hash = writeJar("gui-shop", "2.1.0.jar", "jar-bytes");
    const repo = new LocalRepository({ id: "local1", type: "local", basePath: "mods" }, root, cacheDir);

    const versions = await repo.getVersions("gui-shop", ["1.21.1"], [], "2.1.0");

    expect(versions).toHaveLength(1);
    expect(versions[0]?.version).toBe("2.1.0");
    expect(versions[0]?.hash).toBe(hash);
    expect(versions[0]?.minecraftVersions).toEqual(["1.21.1"]);
    expect(versions[0]?.url.startsWith("file://")).toBe(true);
  });

  it("enumerates all jars when no wanted version is given", async () => {
    writeJar("gui-shop", "2.0.0.jar", "a");
    writeJar("gui-shop", "2.1.0.jar", "b");
    const repo = new LocalRepository({ id: "local1", type: "local", basePath: "mods" }, root, cacheDir);

    const versions = await repo.getVersions("gui-shop", ["1.21.1"], []);
    expect(versions.map((v) => v.version).sort()).toEqual(["2.0.0", "2.1.0"]);
  });

  it("returns empty when the slug directory does not exist", async () => {
    const repo = new LocalRepository({ id: "local1", type: "local", basePath: "mods" }, root, cacheDir);
    const versions = await repo.getVersions("nonexistent", ["1.21.1"], []);
    expect(versions).toEqual([]);
  });

  it("excludes files that don't match mcVersionPattern when strictMcVersion is set", async () => {
    writeJar("gui-shop", "gui-shop-mc1.21.1.jar", "a");
    writeJar("gui-shop", "gui-shop-unversioned.jar", "b");
    const repo = new LocalRepository(
      {
        id: "local1",
        type: "local",
        basePath: "mods",
        strictMcVersion: true,
        mcVersionPattern: "mc([\\d.]+)\\.jar$",
      },
      root,
      cacheDir,
    );

    const versions = await repo.getVersions("gui-shop", ["1.21.1"], []);
    expect(versions).toHaveLength(1);
    expect(versions[0]?.minecraftVersions).toEqual(["1.21.1"]);
  });

  function writeDatapackDir(base: string, slug: string, version: string, files: Record<string, string>): string {
    const dir = join(root, base, slug, version);
    for (const [relPath, content] of Object.entries(files)) {
      const fullPath = join(dir, relPath);
      mkdirSync(join(fullPath, ".."), { recursive: true });
      writeFileSync(fullPath, content);
    }
    return dir;
  }

  it("zips a raw content directory on demand and returns a fetchable file:// url", async () => {
    writeDatapackDir("datapacks", "my-pack", "1.0.0", {
      "pack.mcmeta": '{"pack":{"pack_format":48}}',
      "data/my_pack/functions/hello.mcfunction": "say hello",
    });
    const repo = new LocalRepository({ id: "local1", type: "local", basePath: "datapacks" }, root, cacheDir);

    const versions = await repo.getVersions("my-pack", ["1.21.1"], [], "1.0.0");

    expect(versions).toHaveLength(1);
    const result = versions[0]!;
    expect(result.url.startsWith("file://")).toBe(true);
    expect(result.url.endsWith(".zip")).toBe(true);

    const zipPath = fileURLToPath(result.url);
    expect(existsSync(zipPath)).toBe(true);

    const zipBytes = readFileSync(zipPath);
    expect(createHash("sha512").update(zipBytes).digest("hex")).toBe(result.hash);

    const zip = await JSZip.loadAsync(zipBytes);
    expect(await zip.file("pack.mcmeta")?.async("string")).toBe('{"pack":{"pack_format":48}}');
    expect(await zip.file("data/my_pack/functions/hello.mcfunction")?.async("string")).toBe("say hello");
  });

  it("zips the slug directory itself when there's no {version}.jar or {version}/ subfolder (flat layout)", async () => {
    const dir = join(root, "datapacks", "RWRewards");
    mkdirSync(join(dir, "data"), { recursive: true });
    writeFileSync(join(dir, "pack.mcmeta"), '{"pack":{"pack_format":48}}');
    writeFileSync(join(dir, "data", "reward.json"), "{}");

    const repo = new LocalRepository({ id: "local", type: "local", basePath: "datapacks" }, root, cacheDir);
    const versions = await repo.getVersions("rwrewards", ["1.21.1"], [], "1.0.0");

    expect(versions).toHaveLength(1);
    const zip = await JSZip.loadAsync(readFileSync(fileURLToPath(versions[0]!.url)));
    expect(await zip.file("pack.mcmeta")?.async("string")).toBe('{"pack":{"pack_format":48}}');
    expect(await zip.file("data/reward.json")?.async("string")).toBe("{}");
  });

  it("prefers a {version}.jar file over a same-named directory", async () => {
    const hash = writeJar("gui-shop", "1.0.0.jar", "jar-bytes");
    writeDatapackDir("mods", "gui-shop", "1.0.0", { "pack.mcmeta": "{}" });
    const repo = new LocalRepository({ id: "local1", type: "local", basePath: "mods" }, root, cacheDir);

    const versions = await repo.getVersions("gui-shop", ["1.21.1"], [], "1.0.0");

    expect(versions).toHaveLength(1);
    expect(versions[0]?.hash).toBe(hash);
    expect(versions[0]?.url.endsWith(".jar")).toBe(true);
  });

  it("enumerates both jar files and content directories when no wanted version is given", async () => {
    writeJar("mixed", "1.0.0.jar", "a");
    writeDatapackDir("mods", "mixed", "2.0.0", { "pack.mcmeta": "{}" });
    const repo = new LocalRepository({ id: "local1", type: "local", basePath: "mods" }, root, cacheDir);

    const versions = await repo.getVersions("mixed", ["1.21.1"], []);
    expect(versions.map((v) => v.version).sort()).toEqual(["1.0.0", "2.0.0"]);
  });

  it("resolves a slug case-insensitively against a differently-cased directory", async () => {
    writeDatapackDir("datapacks", "RWRewards", "1.0.0", { "pack.mcmeta": "{}" });
    const repo = new LocalRepository({ id: "local1", type: "local", basePath: "datapacks" }, root, cacheDir);

    const versions = await repo.getVersions("rwrewards", ["1.21.1"], [], "1.0.0");

    expect(versions).toHaveLength(1);
    expect(versions[0]?.version).toBe("1.0.0");
  });

  it("prefers an exact-case directory match over a differently-cased one", async () => {
    writeDatapackDir("datapacks", "Pack", "1.0.0", { "pack.mcmeta": '{"exact":true}' });
    writeDatapackDir("datapacks", "pack", "1.0.0", { "pack.mcmeta": '{"exact":false}' });
    const repo = new LocalRepository({ id: "local1", type: "local", basePath: "datapacks" }, root, cacheDir);

    const versions = await repo.getVersions("pack", ["1.21.1"], [], "1.0.0");

    expect(versions).toHaveLength(1);
    const zip = await JSZip.loadAsync(readFileSync(fileURLToPath(versions[0]!.url)));
    expect(await zip.file("pack.mcmeta")?.async("string")).toBe('{"exact":false}');
  });
});
