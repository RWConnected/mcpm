import {afterEach, describe, expect, it} from "bun:test";
import {createHash} from "crypto";
import {UrlRepository} from "./url-repository.js";

describe("UrlRepository", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.TEST_URL_TOKEN;
  });

  it("returns nothing without a wanted version (cannot enumerate)", async () => {
    const repo = new UrlRepository({ id: "url1", type: "url", urlTemplate: "https://x/{slug}/{version}.jar" });
    const versions = await repo.getVersions("gui-shop", ["1.21.1"], []);
    expect(versions).toEqual([]);
  });

  it("substitutes the template, downloads and hashes the asset", async () => {
    const bytes = "jar-bytes";
    let requestedUrl = "";
    globalThis.fetch = (async (url: string) => {
      requestedUrl = url;
      return { ok: true, arrayBuffer: async () => new TextEncoder().encode(bytes).buffer } as Response;
    }) as unknown as typeof fetch;

    const repo = new UrlRepository({ id: "url1", type: "url", urlTemplate: "https://x/{slug}/{version}.jar" });
    const versions = await repo.getVersions("gui-shop", ["1.21.1"], [], "2.1.0");

    expect(requestedUrl).toBe("https://x/gui-shop/2.1.0.jar");
    expect(versions).toHaveLength(1);
    expect(versions[0]?.version).toBe("2.1.0");
    expect(versions[0]?.hash).toBe(createHash("sha512").update(bytes).digest("hex"));
    expect(versions[0]?.minecraftVersions).toEqual(["1.21.1"]);
  });

  it("returns empty when the fetch fails", async () => {
    globalThis.fetch = (async () => ({ ok: false }) as Response) as unknown as typeof fetch;
    const repo = new UrlRepository({ id: "url1", type: "url", urlTemplate: "https://x/{version}.jar" });
    const versions = await repo.getVersions("gui-shop", ["1.21.1"], [], "2.1.0");
    expect(versions).toEqual([]);
  });

  it("excludes the version when strictMcVersion is set and no pattern matches", async () => {
    globalThis.fetch = (async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) }) as Response) as unknown as typeof fetch;
    const repo = new UrlRepository({
      id: "url1",
      type: "url",
      urlTemplate: "https://x/{version}.jar",
      strictMcVersion: true,
    });
    const versions = await repo.getVersions("gui-shop", ["1.21.1"], [], "2.1.0");
    expect(versions).toEqual([]);
  });

  it("provides a bearer auth header when tokenEnv resolves", () => {
    process.env.TEST_URL_TOKEN = "secret";
    const repo = new UrlRepository({ id: "url1", type: "url", urlTemplate: "https://x/{version}.jar", tokenEnv: "TEST_URL_TOKEN" });
    expect(repo.getDownloadHeaders("https://x/2.1.0.jar")).toEqual({ Authorization: "Bearer secret" });
  });

  it("returns no auth header when tokenEnv is unset", () => {
    const repo = new UrlRepository({ id: "url1", type: "url", urlTemplate: "https://x/{version}.jar" });
    expect(repo.getDownloadHeaders("https://x/2.1.0.jar")).toBeUndefined();
  });
});
