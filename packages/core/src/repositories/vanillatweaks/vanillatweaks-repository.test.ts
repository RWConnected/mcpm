import {afterEach, describe, expect, it} from "bun:test";
import {createHash} from "crypto";
import {VanillaTweaksRepository} from "./vanillatweaks-repository.js";

describe("VanillaTweaksRepository", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns nothing without a wanted version (cannot enumerate)", async () => {
    const repo = new VanillaTweaksRepository({
      id: "vt1",
      type: "vanillatweaks",
      datapacks: { core: { qol: ["armor statues"] } },
    });
    const versions = await repo.getVersions("core", ["1.21"], []);
    expect(versions).toEqual([]);
  });

  it("returns nothing for a slug not defined in either bundle map", async () => {
    const repo = new VanillaTweaksRepository({
      id: "vt1",
      type: "vanillatweaks",
      datapacks: { core: { qol: ["armor statues"] } },
    });
    const versions = await repo.getVersions("nonexistent", ["1.21"], [], "1.21");
    expect(versions).toEqual([]);
  });

  it("POSTs the datapacks selection wrapped as dpcategories, then downloads and hashes the zip", async () => {
    const zipBytes = "zip-bytes";
    const calls: { url: string; init?: RequestInit }[] = [];
    globalThis.fetch = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (url.includes("zipdatapacks.php")) {
        return { ok: true, json: async () => ({ status: "success", link: "/download/abc.zip" }) } as Response;
      }
      return { ok: true, arrayBuffer: async () => new TextEncoder().encode(zipBytes).buffer } as Response;
    }) as unknown as typeof fetch;

    const repo = new VanillaTweaksRepository({
      id: "vt1",
      type: "vanillatweaks",
      datapacks: { core: { qol: ["armor statues"] } },
    });

    const versions = await repo.getVersions("core", ["1.21"], [], "1.21");

    expect(calls[0]?.url).toBe("https://vanillatweaks.net/assets/server/zipdatapacks.php");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      version: "1.21",
      dpcategories: { qol: ["armor statues"] },
    });
    expect(calls[1]?.url).toBe("https://vanillatweaks.net/download/abc.zip");

    expect(versions).toHaveLength(1);
    expect(versions[0]?.version).toBe("1.21");
    expect(versions[0]?.hash).toBe(createHash("sha512").update(zipBytes).digest("hex"));
    expect(versions[0]?.url).toBe("https://vanillatweaks.net/download/abc.zip");
  });

  it("POSTs the craftingtweaks selection wrapped as ctcategories", async () => {
    const calls: string[] = [];
    globalThis.fetch = (async (url: string) => {
      calls.push(url);
      if (url.includes("zipcraftingtweaks.php")) {
        return { ok: true, json: async () => ({ status: "success", link: "/download/xyz.zip" }) } as Response;
      }
      return { ok: true, arrayBuffer: async () => new ArrayBuffer(0) } as Response;
    }) as unknown as typeof fetch;

    const repo = new VanillaTweaksRepository({
      id: "vt1",
      type: "vanillatweaks",
      craftingtweaks: { tools: { hermitcraft: ["silence hoppers"] } },
    });

    const versions = await repo.getVersions("tools", ["1.21"], [], "1.21");

    expect(calls[0]).toBe("https://vanillatweaks.net/assets/server/zipcraftingtweaks.php");
    expect(versions).toHaveLength(1);
  });

  it("returns nothing when the zip-builder endpoint reports failure", async () => {
    globalThis.fetch = (async () => ({ ok: true, json: async () => ({ status: "error" }) }) as Response) as unknown as typeof fetch;
    const repo = new VanillaTweaksRepository({
      id: "vt1",
      type: "vanillatweaks",
      datapacks: { core: { qol: ["armor statues"] } },
    });
    const versions = await repo.getVersions("core", ["1.21"], [], "1.21");
    expect(versions).toEqual([]);
  });

  it("POSTs the resourcepacks selection wrapped as rpcategories, only when loaders signal resourcepack", async () => {
    const calls: string[] = [];
    globalThis.fetch = (async (url: string) => {
      calls.push(url);
      if (url.includes("zipresourcepacks.php")) {
        return { ok: true, json: async () => ({ status: "success", link: "/download/rp.zip" }) } as Response;
      }
      return { ok: true, arrayBuffer: async () => new ArrayBuffer(0) } as Response;
    }) as unknown as typeof fetch;

    const repo = new VanillaTweaksRepository({
      id: "vt1",
      type: "vanillatweaks",
      resourcepacks: { core: { "faithful 32x": ["clear glass"] } },
    });

    const versions = await repo.getVersions("core", ["1.21"], ["resourcepack"], "1.21");

    expect(calls[0]).toBe("https://vanillatweaks.net/assets/server/zipresourcepacks.php");
    expect(versions).toHaveLength(1);
  });

  it("does not find a resourcepacks bundle when loaders don't signal resourcepack, even with a matching slug", async () => {
    const repo = new VanillaTweaksRepository({
      id: "vt1",
      type: "vanillatweaks",
      resourcepacks: { core: { "faithful 32x": ["clear glass"] } },
    });
    // loaders = ["datapack"] (or []) must not fall through to the resourcepacks map
    const versions = await repo.getVersions("core", ["1.21"], ["datapack"], "1.21");
    expect(versions).toEqual([]);
  });

  it("a resourcepacks bundle and a datapacks bundle can share the same slug without colliding", async () => {
    globalThis.fetch = (async (url: string) => {
      if (url.includes("zipresourcepacks.php")) {
        return { ok: true, json: async () => ({ status: "success", link: "/download/rp.zip" }) } as Response;
      }
      if (url.includes("zipdatapacks.php")) {
        return { ok: true, json: async () => ({ status: "success", link: "/download/dp.zip" }) } as Response;
      }
      return { ok: true, arrayBuffer: async () => new ArrayBuffer(0) } as Response;
    }) as unknown as typeof fetch;

    const repo = new VanillaTweaksRepository({
      id: "vt1",
      type: "vanillatweaks",
      datapacks: { core: { qol: ["armor statues"] } },
      resourcepacks: { core: { "faithful 32x": ["clear glass"] } },
    });

    const dp = await repo.getVersions("core", ["1.21"], ["datapack"], "1.21");
    const rp = await repo.getVersions("core", ["1.21"], ["resourcepack"], "1.21");

    expect(dp[0]?.url).toBe("https://vanillatweaks.net/download/dp.zip");
    expect(rp[0]?.url).toBe("https://vanillatweaks.net/download/rp.zip");
  });

  it("returns nothing when the zip-builder request fails", async () => {
    globalThis.fetch = (async () => ({ ok: false }) as Response) as unknown as typeof fetch;
    const repo = new VanillaTweaksRepository({
      id: "vt1",
      type: "vanillatweaks",
      datapacks: { core: { qol: ["armor statues"] } },
    });
    const versions = await repo.getVersions("core", ["1.21"], [], "1.21");
    expect(versions).toEqual([]);
  });
});
