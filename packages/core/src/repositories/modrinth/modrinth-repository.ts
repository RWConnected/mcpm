// ModrinthRepository ported from src-tauri/src/app/modules/repositories/modrinth/modrinth_repository.rs

import type { IRepository } from "../repository.interface.js";
import type { ModResult, VersionResult } from "../../models/repository.js";
import type { Side } from "../../models/manifest.js";
import type {
  SearchResponse,
  FindResponse,
  VersionItem,
} from "./modrinth-models.js";

const PAGINATION_SIZE = 20;

export class ModrinthRepository implements IRepository {
  private headers: Record<string, string> = {};

  constructor(modrinthToken?: string) {
    if (modrinthToken) {
      this.headers["Authorization"] = `Bearer ${modrinthToken}`;
    }
  }

  async search(query: string, page: number): Promise<ModResult[]> {
    const offset = page * PAGINATION_SIZE;
    const url = `https://api.modrinth.com/v2/search?query=${encodeURIComponent(query)}&offset=${offset}&limit=${PAGINATION_SIZE}`;

    try {
      const res = await fetch(url, { headers: this.headers });
      if (!res.ok) return [];
      const parsed: SearchResponse = await res.json();

      return parsed.hits.map((hit) => ({
        id: hit.project_id,
        slug: hit.slug,
        name: hit.title,
        description: hit.description,
        source: "Modrinth",
        side: getSide(hit.client_side, hit.server_side),
        url: `https://modrinth.com/mod/${hit.slug}`,
      }));
    } catch {
      return [];
    }
  }

  async find(slug: string): Promise<ModResult | undefined> {
    const url = `https://api.modrinth.com/v2/project/${encodeURIComponent(slug)}`;

    try {
      const res = await fetch(url, { headers: this.headers });
      if (!res.ok) return undefined;
      const response: FindResponse = await res.json();

      return {
        id: response.id,
        slug: response.slug,
        name: response.title,
        description: response.description,
        source: "Modrinth",
        side: getSide(response.client_side, response.server_side),
        url: `https://modrinth.com/mod/${response.slug}`,
      };
    } catch {
      return undefined;
    }
  }

  async getVersions(
    projectId: string,
    gameVersions: string[],
    loaders: string[],
  ): Promise<VersionResult[]> {
    const url =
      `https://api.modrinth.com/v2/project/${encodeURIComponent(projectId)}/version` +
      `?game_versions=${encodeURIComponent(JSON.stringify(gameVersions))}` +
      `&loaders=${encodeURIComponent(JSON.stringify(loaders))}`;

    try {
      const res = await fetch(url, { headers: this.headers });
      if (!res.ok) return [];
      const parsed: VersionItem[] = await res.json();

      return parsed.map((v) => {
        const primaryFile = v.files.find((f) => f.primary);
        return {
          modId: v.project_id,
          version: v.version_number,
          minecraftVersions: v.game_versions,
          url: primaryFile?.url ?? "",
          hash:
            primaryFile?.hashes?.sha512 ??
            primaryFile?.hashes?.sha1 ??
            "",
        };
      });
    } catch {
      return [];
    }
  }
}

function getSide(client: string, server: string): Side {
  const clientSupported = client === "required" || client === "optional";
  const serverSupported = server === "required" || server === "optional";

  if (clientSupported && serverSupported) return "both";
  if (clientSupported) return "client";
  if (serverSupported) return "server";
  return "unknown";
}
