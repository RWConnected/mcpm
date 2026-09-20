import {afterEach, describe, expect, it} from "bun:test";
import {createHash} from "crypto";
import {GitReleaseRepository} from "./git-release-repository.js";

function jsonResponse(body: unknown, ok = true): Response {
  return { ok, json: async () => body, text: async () => "" } as Response;
}

describe("GitReleaseRepository", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.TEST_GH_TOKEN;
  });

  it("lists github releases, picks the jar asset, derives mc version from the tag", async () => {
    const assetBytes = "jar-bytes";
    globalThis.fetch = (async (url: string) => {
      if (url.includes("api.github.com")) {
        return jsonResponse([
          {
            tag_name: "1.21.1-2.1.0",
            assets: [
              { name: "gui-shop-2.1.0.jar", browser_download_url: "https://dl/gui-shop-2.1.0.jar" },
              { name: "gui-shop-2.1.0.jar.sha512", browser_download_url: "https://dl/gui-shop-2.1.0.jar.sha512" },
            ],
          },
        ]);
      }
      if (url === "https://dl/gui-shop-2.1.0.jar.sha512") {
        return { ok: true, text: async () => createHash("sha512").update(assetBytes).digest("hex") } as Response;
      }
      throw new Error(`unexpected url ${url}`);
    }) as unknown as typeof fetch;

    const repo = new GitReleaseRepository({
      id: "gh1",
      type: "github",
      owner: "rickiewars",
      repo: "gui-shop",
      mcVersionPattern: "^([\\d.]+)-",
    });

    const versions = await repo.getVersions("gui-shop", ["1.21.1"], []);

    expect(versions).toHaveLength(1);
    expect(versions[0]?.version).toBe("1.21.1-2.1.0");
    expect(versions[0]?.url).toBe("https://dl/gui-shop-2.1.0.jar");
    expect(versions[0]?.minecraftVersions).toEqual(["1.21.1"]);
    expect(versions[0]?.hash).toBe(createHash("sha512").update(assetBytes).digest("hex"));
  });

  it("falls back to downloading and hashing the asset when no sidecar checksum exists", async () => {
    const assetBytes = "jar-bytes";
    globalThis.fetch = (async (url: string) => {
      if (url.includes("api.github.com")) {
        return jsonResponse([
          {
            tag_name: "2.1.0",
            assets: [{ name: "gui-shop-2.1.0.jar", browser_download_url: "https://dl/gui-shop-2.1.0.jar" }],
          },
        ]);
      }
      if (url === "https://dl/gui-shop-2.1.0.jar") {
        return { ok: true, arrayBuffer: async () => new TextEncoder().encode(assetBytes).buffer } as Response;
      }
      throw new Error(`unexpected url ${url}`);
    }) as unknown as typeof fetch;

    const repo = new GitReleaseRepository({ id: "gh1", type: "github", owner: "rickiewars", repo: "gui-shop", mcVersion: "1.21.1" });
    const versions = await repo.getVersions("gui-shop", ["1.20.1"], []);

    expect(versions).toHaveLength(1);
    expect(versions[0]?.minecraftVersions).toEqual(["1.21.1"]);
    expect(versions[0]?.hash).toBe(createHash("sha512").update(assetBytes).digest("hex"));
  });

  it("skips a release with no matching asset instead of throwing", async () => {
    globalThis.fetch = (async () => jsonResponse([{ tag_name: "1.0.0", assets: [] }])) as unknown as typeof fetch;
    const repo = new GitReleaseRepository({ id: "gh1", type: "github", owner: "o", repo: "r" });
    const versions = await repo.getVersions("r", ["1.21.1"], []);
    expect(versions).toEqual([]);
  });

  it("returns empty on network failure instead of throwing", async () => {
    globalThis.fetch = (async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;
    const repo = new GitReleaseRepository({ id: "gh1", type: "github", owner: "o", repo: "r" });
    const versions = await repo.getVersions("r", ["1.21.1"], []);
    expect(versions).toEqual([]);
  });

  it("queries the gitlab releases API for a gitlab provider and uses PRIVATE-TOKEN auth", async () => {
    process.env.TEST_GH_TOKEN = "secret";
    let seenHeaders: Record<string, string> | undefined;
    globalThis.fetch = (async (url: string, init?: RequestInit) => {
      if (url === "https://dl/gui-shop.jar") {
        return { ok: true, arrayBuffer: async () => new ArrayBuffer(0) } as Response;
      }
      expect(url).toContain("gitlab.com/api/v4/projects/");
      seenHeaders = init?.headers as Record<string, string>;
      return jsonResponse([
        { tag_name: "2.1.0", assets: { links: [{ name: "gui-shop.jar", url: "https://dl/gui-shop.jar" }] } },
      ]);
    }) as unknown as typeof fetch;

    const repo = new GitReleaseRepository({
      id: "gl1",
      type: "gitlab",
      owner: "rickiewars",
      repo: "gui-shop",
      tokenEnv: "TEST_GH_TOKEN",
    });
    const versions = await repo.getVersions("gui-shop", ["1.21.1"], []);

    expect(versions).toHaveLength(1);
    expect(seenHeaders?.["PRIVATE-TOKEN"]).toBe("secret");
  });
});
