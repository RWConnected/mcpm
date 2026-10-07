import {afterEach, beforeEach, describe, expect, it} from "bun:test";
import JSZip from "jszip";
import {vanillaTweaksContentHash, VanillaTweaksRepository} from "./vanillatweaks-repository.js";

async function buildZip(files: Record<string, string>, date: Date): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file("data/", null, { dir: true, date });
  for (const [name, content] of Object.entries(files)) zip.file(name, content, { date });
  return zip.generateAsync({ type: "arraybuffer" });
}

describe("VanillaTweaksRepository", () => {
  const originalFetch = globalThis.fetch;
  let zipBuffer: ArrayBuffer;

  beforeEach(async () => {
    zipBuffer = await buildZip({ "pack.mcmeta": "{}" }, new Date("2024-01-01T00:00:00Z"));
  });

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

  it("POSTs the datapacks selection form-urlencoded as version+packs, then downloads and hashes the zip", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    globalThis.fetch = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (url.includes("zipdatapacks.php")) {
        return { ok: true, json: async () => ({ status: "success", link: "/download/abc.zip" }) } as Response;
      }
      return { ok: true, arrayBuffer: async () => zipBuffer } as Response;
    }) as unknown as typeof fetch;

    const repo = new VanillaTweaksRepository({
      id: "vt1",
      type: "vanillatweaks",
      datapacks: { core: { qol: ["armor statues"] } },
    });

    const versions = await repo.getVersions("core", ["1.21"], [], "1.21");

    expect(calls[0]?.url).toBe("https://vanillatweaks.net/assets/server/zipdatapacks.php");
    expect(calls[0]?.init?.headers).toEqual({ "Content-Type": "application/x-www-form-urlencoded" });
    const params = new URLSearchParams(calls[0]?.init?.body as string);
    expect(params.get("version")).toBe("1.21");
    expect(JSON.parse(params.get("packs")!)).toEqual({ qol: ["armor statues"] });
    expect(calls[1]?.url).toBe("https://vanillatweaks.net/download/abc.zip");

    expect(versions).toHaveLength(1);
    expect(versions[0]?.version).toBe("1.21");
    expect(versions[0]?.hash).toBe(await vanillaTweaksContentHash(new Uint8Array(zipBuffer)));
    expect(versions[0]?.url).toBe("https://vanillatweaks.net/download/abc.zip");
  });

  it("POSTs the craftingtweaks selection to the craftingtweaks endpoint", async () => {
    const calls: string[] = [];
    globalThis.fetch = (async (url: string) => {
      calls.push(url);
      if (url.includes("zipcraftingtweaks.php")) {
        return { ok: true, json: async () => ({ status: "success", link: "/download/xyz.zip" }) } as Response;
      }
      return { ok: true, arrayBuffer: async () => zipBuffer } as Response;
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

  it("POSTs the resourcepacks selection to the resourcepacks endpoint, only when loaders signal resourcepack", async () => {
    const calls: string[] = [];
    globalThis.fetch = (async (url: string) => {
      calls.push(url);
      if (url.includes("zipresourcepacks.php")) {
        return { ok: true, json: async () => ({ status: "success", link: "/download/rp.zip" }) } as Response;
      }
      return { ok: true, arrayBuffer: async () => zipBuffer } as Response;
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
      return { ok: true, arrayBuffer: async () => zipBuffer } as Response;
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

  it("content hash ignores zip timestamps (craftingtweaks zips are rebuilt per request)", async () => {
    const files = { "pack.mcmeta": "{}", "Selected Packs.txt": "dropper to dispenser" };
    const a = await buildZip(files, new Date("2024-01-01T00:00:00Z"));
    const b = await buildZip(files, new Date("2026-10-07T18:07:00Z"));
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(false);
    expect(await vanillaTweaksContentHash(new Uint8Array(a))).toBe(await vanillaTweaksContentHash(new Uint8Array(b)));
  });

  it("content hash changes when file contents change", async () => {
    const date = new Date("2024-01-01T00:00:00Z");
    const a = await buildZip({ "pack.mcmeta": "{}" }, date);
    const b = await buildZip({ "pack.mcmeta": "{ }" }, date);
    expect(await vanillaTweaksContentHash(new Uint8Array(a))).not.toBe(await vanillaTweaksContentHash(new Uint8Array(b)));
  });

  it("resolveDownloadUrl requests a freshly built zip instead of reusing the locked link", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    globalThis.fetch = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return { ok: true, json: async () => ({ status: "success", link: "/download/fresh.zip" }) } as Response;
    }) as unknown as typeof fetch;

    const repo = new VanillaTweaksRepository({
      id: "vt1",
      type: "vanillatweaks",
      craftingtweaks: { tools: { hermitcraft: ["silence hoppers"] } },
    });

    const url = await repo.resolveDownloadUrl(
      { id: "tools", version: "26.3", minecraft_versions: ["26.3"], url: "https://vanillatweaks.net/download/stale.zip", hash: "h" },
      ["datapack"],
    );

    expect(url).toBe("https://vanillatweaks.net/download/fresh.zip");
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://vanillatweaks.net/assets/server/zipcraftingtweaks.php");
    expect(new URLSearchParams(calls[0]?.init?.body as string).get("version")).toBe("26.3");
  });

  it("resolveDownloadUrl throws when the zip-builder fails", async () => {
    globalThis.fetch = (async () => ({ ok: true, json: async () => ({ status: "error" }) }) as Response) as unknown as typeof fetch;
    const repo = new VanillaTweaksRepository({
      id: "vt1",
      type: "vanillatweaks",
      datapacks: { core: { qol: ["armor statues"] } },
    });
    await expect(
      repo.resolveDownloadUrl({ id: "core", version: "26.3", minecraft_versions: [], url: "", hash: "" }, ["datapack"]),
    ).rejects.toThrow("failed to build");
  });
});
