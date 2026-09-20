import type {McVersionMatchConfig} from "../models/provider-config.js";

/**
 * Resolve the minecraft version(s) a release/asset is compatible with, given a provider's
 * matching config. Tries the static override first, then the regex pattern against the tag
 * name and then the asset name. If neither is configured/matches: strictMcVersion=true
 * excludes it (returns undefined), false (default) trusts the requested gameVersions.
 */
export function resolveMcVersions(
  cfg: McVersionMatchConfig,
  tagName: string,
  assetName: string,
  gameVersions: string[],
): string[] | undefined {
  if (cfg.mcVersion) return [cfg.mcVersion];

  if (cfg.mcVersionPattern) {
    const pattern = new RegExp(cfg.mcVersionPattern);
    const match = pattern.exec(tagName) ?? pattern.exec(assetName);
    if (match?.[1]) return [match[1]];
  }

  return cfg.strictMcVersion ? undefined : gameVersions;
}
