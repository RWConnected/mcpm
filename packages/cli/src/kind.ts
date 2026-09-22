import type {ResourceKind} from "@mcpm/core";

const VALID_KINDS: ResourceKind[] = ["mod", "datapack", "resourcepack", "shaderpack"];

export const KIND_LABEL: Record<ResourceKind, string> = {
  mod: "Mod",
  datapack: "Datapack",
  resourcepack: "Resourcepack",
  shaderpack: "Shaderpack",
};

export const KIND_FOLDER: Record<ResourceKind, string> = {
  mod: "mods",
  datapack: "datapacks",
  resourcepack: "resourcepacks",
  shaderpack: "shaderpacks",
};

/** Parses a --type option value, falling back to "mod" for anything unrecognized. */
export function parseKind(type: unknown): ResourceKind {
  return VALID_KINDS.includes(type as ResourceKind) ? (type as ResourceKind) : "mod";
}

/** `list`/`outdated` print entries as "provider:slug" — accept that combined form as the slug
 * arg (when no separate provider arg was given) so it can be copy-pasted straight back in. */
export function splitSlugArg(slug: string, provider: string | undefined): { slug: string; provider?: string } {
  if (provider !== undefined) return { slug, provider };
  const idx = slug.indexOf(":");
  if (idx === -1) return { slug };
  return { provider: slug.slice(0, idx), slug: slug.slice(idx + 1) };
}
