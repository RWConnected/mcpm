import {createHash} from "crypto";
import JSZip from "jszip";
import type {IRepository} from "../repository.interface.js";
import type {LockEntry} from "../../models/lockfile.js";
import type {ModResult, VersionResult} from "../../models/repository.js";
import type {VanillaTweaksProviderConfig, VanillaTweaksSelection} from "../../models/provider-config.js";

type BundleType = "datapacks" | "craftingtweaks" | "resourcepacks";

/** Zip-builder endpoint VanillaTweaks' own site posts to per bundle type. Isolated here so a
 * future change to their API is a one-place fix. */
const ENDPOINT_URLS: Record<BundleType, string> = {
  datapacks: "https://vanillatweaks.net/assets/server/zipdatapacks.php",
  craftingtweaks: "https://vanillatweaks.net/assets/server/zipcraftingtweaks.php",
  resourcepacks: "https://vanillatweaks.net/assets/server/zipresourcepacks.php",
};

/** Builds the request body VanillaTweaks' zip-builder endpoint expects: form-urlencoded (not
 * JSON) with a "version" field and a "packs" field holding the JSON-stringified selection —
 * same field name for every bundle type, verified against the live endpoint. */
export function buildVanillaTweaksRequestBody(selection: VanillaTweaksSelection, version: string): URLSearchParams {
  return new URLSearchParams({ version, packs: JSON.stringify(selection) });
}

interface VanillaTweaksZipResponse {
  status: string;
  link?: string;
}

/** Hash of a VanillaTweaks zip that only covers file names + contents. Their zips are rebuilt on
 * every request and some bundle types (craftingtweaks) stamp directory entries and
 * "Selected Packs.txt" with the build time, so a raw byte hash is never reproducible. */
export async function vanillaTweaksContentHash(bytes: Uint8Array): Promise<string> {
  const zip = await JSZip.loadAsync(bytes);
  const files = Object.values(zip.files).filter((f) => !f.dir).sort((a, b) => a.name.localeCompare(b.name));
  const outer = createHash("sha512");
  for (const file of files) {
    const content = await file.async("uint8array");
    outer.update(`${file.name}\0${createHash("sha512").update(content).digest("hex")}\n`);
  }
  return outer.digest("hex");
}

export class VanillaTweaksRepository implements IRepository {
  readonly supportsDiscovery = false;

  constructor(private readonly cfg: VanillaTweaksProviderConfig) {}

  async search(): Promise<ModResult[]> {
    return [];
  }

  async find(): Promise<ModResult | undefined> {
    return undefined;
  }

  /** Only exact VersionSpecs are usable — there is no version history, just a rebuilt-on-demand zip. */
  async getVersions(
    slug: string,
    gameVersions: string[],
    loaders: string[],
    wantedVersion?: string,
  ): Promise<VersionResult[]> {
    if (!wantedVersion) return [];

    const found = this.findBundle(slug, loaders);
    if (!found) return [];

    try {
      const zipUrl = await this.requestZipUrl(found.type, found.selection, wantedVersion);
      if (!zipUrl) return [];
      const zipRes = await fetch(zipUrl);
      if (!zipRes.ok) return [];
      const hash = await vanillaTweaksContentHash(new Uint8Array(await zipRes.arrayBuffer()));

      return [{ modId: slug, version: wantedVersion, minecraftVersions: gameVersions, url: zipUrl, hash }];
    } catch {
      return [];
    }
  }

  /** Download links are one-off files VanillaTweaks generates per request and may clean up, so
   * the locked url can't be trusted later — ask for a freshly built zip instead. */
  async resolveDownloadUrl(entry: LockEntry, loaders: string[]): Promise<string> {
    const found = this.findBundle(entry.id, loaders);
    if (!found) throw new Error(`VanillaTweaks bundle '${entry.id}' is not defined in provider config`);
    const zipUrl = await this.requestZipUrl(found.type, found.selection, entry.version);
    if (!zipUrl) throw new Error(`VanillaTweaks failed to build bundle '${entry.id}' for ${entry.version}`);
    return zipUrl;
  }

  contentHash(bytes: Uint8Array): Promise<string> {
    return vanillaTweaksContentHash(bytes);
  }

  private async requestZipUrl(
    type: BundleType,
    selection: VanillaTweaksSelection,
    version: string,
  ): Promise<string | undefined> {
    const res = await fetch(ENDPOINT_URLS[type], {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: buildVanillaTweaksRequestBody(selection, version).toString(),
    });
    if (!res.ok) return undefined;

    const json = (await res.json()) as VanillaTweaksZipResponse;
    if (json.status !== "success" || !json.link) return undefined;

    return json.link.startsWith("http") ? json.link : `https://vanillatweaks.net${json.link}`;
  }

  /** Which bundle map to search is driven by the caller's ResourceKind, carried through the
   * pseudo-loader convention (see manifest.ts's loadersForKind): "resourcepack" -> resourcepacks
   * only, anything else -> datapacks then craftingtweaks (both reached via loaders=["datapack"]). */
  private findBundle(
    slug: string,
    loaders: string[],
  ): { type: BundleType; selection: VanillaTweaksSelection } | undefined {
    if (loaders.includes("resourcepack")) {
      const resourcepack = this.cfg.resourcepacks?.[slug];
      return resourcepack ? { type: "resourcepacks", selection: resourcepack } : undefined;
    }
    const datapack = this.cfg.datapacks?.[slug];
    if (datapack) return { type: "datapacks", selection: datapack };
    const craftingtweak = this.cfg.craftingtweaks?.[slug];
    if (craftingtweak) return { type: "craftingtweaks", selection: craftingtweak };
    return undefined;
  }
}
