import {afterEach, beforeEach, describe, expect, it} from "bun:test";
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from "fs";
import {join} from "path";
import {tmpdir} from "os";
import {createHash} from "crypto";
import {LocalRepository} from "./local-repository.js";

describe("LocalRepository", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "mcpm-local-repo-test-"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
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
    const repo = new LocalRepository({ id: "local1", type: "local", basePath: "mods" }, root);

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
    const repo = new LocalRepository({ id: "local1", type: "local", basePath: "mods" }, root);

    const versions = await repo.getVersions("gui-shop", ["1.21.1"], []);
    expect(versions.map((v) => v.version).sort()).toEqual(["2.0.0", "2.1.0"]);
  });

  it("returns empty when the slug directory does not exist", async () => {
    const repo = new LocalRepository({ id: "local1", type: "local", basePath: "mods" }, root);
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
    );

    const versions = await repo.getVersions("gui-shop", ["1.21.1"], []);
    expect(versions).toHaveLength(1);
    expect(versions[0]?.minecraftVersions).toEqual(["1.21.1"]);
  });
});
