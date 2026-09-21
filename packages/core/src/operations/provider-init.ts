import {mkdirSync} from "fs";
import {isAbsolute, join} from "path";
import type {ModManager} from "./mod-manager.js";
import {RESERVED_PROVIDER_IDS} from "../models/manifest.js";
import type {ProviderConfig} from "../models/provider-config.js";

export const PROVIDER_TYPES = ["local", "url", "github", "gitlab", "vanillatweaks"] as const;
export type ProviderType = (typeof PROVIDER_TYPES)[number];

export interface ProviderInitOptions {
  id: string;
  type: ProviderType;
  /** local only. Defaults to "./local-mods". */
  path?: string;
  /** url only. Defaults to an editable placeholder template. */
  urlTemplate?: string;
  /** github/gitlab. Left as "" (invalid, nudges via `provider list`) if omitted. */
  owner?: string;
  repo?: string;
  /** gitlab only, for self-hosted instances. */
  host?: string;
}

export class ProviderInit {
  /** Scaffolds a new provider config into the manifest — always writes something syntactically
   * present, using placeholders/empty values for anything not given so it shows up as an
   * actionable "invalid" nudge via `mcpm provider list` rather than silently failing later. */
  static run(manager: ModManager, options: ProviderInitOptions): ProviderConfig {
    const manifest = manager.manifestService.manifest;

    if (RESERVED_PROVIDER_IDS.has(options.id)) {
      throw new Error(`Provider id '${options.id}' is reserved`);
    }
    if ((manifest.providers ?? []).some((p) => p.id === options.id)) {
      throw new Error(`Provider id '${options.id}' already exists`);
    }

    const config = buildConfig(options);

    if (config.type === "local") {
      const basePath = isAbsolute(config.basePath) ? config.basePath : join(manager.config.projectDir, config.basePath);
      mkdirSync(basePath, { recursive: true });
    }

    manifest.providers = [...(manifest.providers ?? []), config];
    manager.saveAll();

    return config;
  }
}

function buildConfig(options: ProviderInitOptions): ProviderConfig {
  switch (options.type) {
    case "local":
      return { id: options.id, type: "local", basePath: options.path ?? "./local-mods" };
    case "url":
      return {
        id: options.id,
        type: "url",
        urlTemplate: options.urlTemplate ?? "https://example.com/{slug}/{version}.jar",
      };
    case "github":
      return { id: options.id, type: "github", owner: options.owner ?? "", repo: options.repo ?? "" };
    case "gitlab":
      return {
        id: options.id,
        type: "gitlab",
        owner: options.owner ?? "",
        repo: options.repo ?? "",
        ...(options.host ? { host: options.host } : {}),
      };
    case "vanillatweaks":
      return { id: options.id, type: "vanillatweaks", datapacks: {}, craftingtweaks: {}, resourcepacks: {} };
  }
}
