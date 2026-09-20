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
