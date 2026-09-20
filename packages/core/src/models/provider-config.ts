import {RESERVED_PROVIDER_IDS} from "./manifest.js";

export interface McVersionMatchConfig {
  /** Static minecraft version override; mod only ever targets one version. */
  readonly mcVersion?: string;
  /** Regex (one capture group) applied to tag/asset name (or filename for local), to derive the minecraft version. */
  readonly mcVersionPattern?: string;
  /**
   * When neither mcVersion nor mcVersionPattern resolves a match: false (default) trusts the
   * requested game version; true excludes the release/version and warns.
   */
  readonly strictMcVersion?: boolean;
}

export interface LocalProviderConfig extends McVersionMatchConfig {
  readonly id: string;
  readonly type: "local";
  readonly basePath: string;
}

export interface UrlProviderConfig extends McVersionMatchConfig {
  readonly id: string;
  readonly type: "url";
  /** Supports {slug} and {version} placeholders. */
  readonly urlTemplate: string;
  /** Name of an environment variable holding a bearer token, for private URLs. */
  readonly tokenEnv?: string;
}

export interface GithubProviderConfig extends McVersionMatchConfig {
  readonly id: string;
  readonly type: "github";
  readonly owner: string;
  readonly repo: string;
  /** Name of an environment variable holding a personal access token, for private repos. */
  readonly tokenEnv?: string;
  /** Regex/substring to pick the right release asset; default: first asset ending in .jar. */
  readonly assetPattern?: string;
}

export interface GitlabProviderConfig extends McVersionMatchConfig {
  readonly id: string;
  readonly type: "gitlab";
  readonly owner: string;
  readonly repo: string;
  /** GitLab host, default gitlab.com (for self-hosted instances). */
  readonly host?: string;
  /** Name of an environment variable holding a personal access token, for private repos. */
  readonly tokenEnv?: string;
  /** Regex/substring to pick the right release asset; default: first asset ending in .jar. */
  readonly assetPattern?: string;
}

/** One bundle's pack selection, grouped by VanillaTweaks category name -> pack names. */
export type VanillaTweaksSelection = Record<string, string[]>;

export interface VanillaTweaksProviderConfig {
  readonly id: string;
  readonly type: "vanillatweaks";
  /** Bundle name -> category->packs selection, POSTed as "dpcategories". */
  readonly datapacks?: Record<string, VanillaTweaksSelection>;
  /** Bundle name -> category->packs selection, POSTed as "ctcategories". Datapacks under the hood,
   * kept separate only because VanillaTweaks' zip endpoint needs the right wrapper key per type. */
  readonly craftingtweaks?: Record<string, VanillaTweaksSelection>;
  /** Bundle name -> category->packs selection, POSTed as "rpcategories". A genuinely different
   * ResourceKind ("resourcepack") from datapacks/craftingtweaks, so its bundle names only need
   * to be unique within this map, not against datapacks/craftingtweaks. */
  readonly resourcepacks?: Record<string, VanillaTweaksSelection>;
}

export type ProviderConfig =
  | LocalProviderConfig
  | UrlProviderConfig
  | GithubProviderConfig
  | GitlabProviderConfig
  | VanillaTweaksProviderConfig;

export interface InvalidProviderConfig {
  readonly config: ProviderConfig;
  readonly reason: string;
}

export interface ValidateProvidersResult {
  readonly valid: ProviderConfig[];
  readonly invalid: InvalidProviderConfig[];
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function compilesAsRegex(pattern: string | undefined): boolean {
  if (pattern === undefined) return true;
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}

function validateOne(config: ProviderConfig): string | undefined {
  if (!isNonEmptyString(config.id)) return "missing id";
  if (RESERVED_PROVIDER_IDS.has(config.id)) return `id '${config.id}' is reserved`;

  switch (config.type) {
    case "local": {
      if (!isNonEmptyString(config.basePath)) return "missing basePath";
      if (!compilesAsRegex(config.mcVersionPattern)) return "mcVersionPattern is not a valid regex";
      return undefined;
    }
    case "url": {
      if (!isNonEmptyString(config.urlTemplate)) return "missing urlTemplate";
      if (!compilesAsRegex(config.mcVersionPattern)) return "mcVersionPattern is not a valid regex";
      return undefined;
    }
    case "github":
    case "gitlab": {
      if (!isNonEmptyString(config.owner)) return "missing owner";
      if (!isNonEmptyString(config.repo)) return "missing repo";
      if (!compilesAsRegex(config.mcVersionPattern)) return "mcVersionPattern is not a valid regex";
      if (!compilesAsRegex(config.assetPattern)) return "assetPattern is not a valid regex";
      return undefined;
    }
    case "vanillatweaks": {
      const datapackNames = Object.keys(config.datapacks ?? {});
      const craftingtweakNames = Object.keys(config.craftingtweaks ?? {});
      const resourcepackNames = Object.keys(config.resourcepacks ?? {});
      if (datapackNames.length === 0 && craftingtweakNames.length === 0 && resourcepackNames.length === 0) {
        return "missing datapacks, craftingtweaks or resourcepacks bundles";
      }
      // resourcepacks are a different ResourceKind/lookup path — only datapacks vs craftingtweaks collide.
      const collisions = datapackNames.filter((name) => craftingtweakNames.includes(name));
      if (collisions.length > 0) {
        return `bundle name(s) ${collisions.join(", ")} defined in both datapacks and craftingtweaks`;
      }
      return undefined;
    }
    default: {
      const type = (config as { type?: unknown }).type;
      return `unknown provider type '${String(type)}'`;
    }
  }
}

/** Pure validation of provider configs: reserved/duplicate ids, unknown types, missing required fields, bad regex. */
export function validateProviders(providers: ProviderConfig[] | undefined): ValidateProvidersResult {
  const valid: ProviderConfig[] = [];
  const invalid: InvalidProviderConfig[] = [];
  const seenIds = new Set<string>();

  for (const config of providers ?? []) {
    const reason = validateOne(config);
    if (reason) {
      invalid.push({ config, reason });
      continue;
    }
    if (seenIds.has(config.id)) {
      invalid.push({ config, reason: `duplicate id '${config.id}'` });
      continue;
    }
    seenIds.add(config.id);
    valid.push(config);
  }

  return { valid, invalid };
}
