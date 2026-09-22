import {createHash} from "crypto";
import type {IRepository} from "../repository.interface.js";
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
      const url = ENDPOINT_URLS[found.type];
      const body = buildVanillaTweaksRequestBody(found.selection, wantedVersion);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      if (!res.ok) return [];

      const json = (await res.json()) as VanillaTweaksZipResponse;
      if (json.status !== "success" || !json.link) return [];

      const zipUrl = json.link.startsWith("http") ? json.link : `https://vanillatweaks.net${json.link}`;
      const zipRes = await fetch(zipUrl);
      if (!zipRes.ok) return [];
      const bytes = new Uint8Array(await zipRes.arrayBuffer());
      const hash = createHash("sha512").update(bytes).digest("hex");

      return [{ modId: slug, version: wantedVersion, minecraftVersions: gameVersions, url: zipUrl, hash }];
    } catch {
      return [];
    }
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
