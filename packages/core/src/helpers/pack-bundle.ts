import JSZip from "jszip";
import {basename} from "path";

export interface BundledPack {
  readonly name: string;
  readonly bytes: Uint8Array;
}

/** Some downloads (e.g. VanillaTweaks datapacks, "..._UNZIP_ME.zip") are a zip of pack zips
 * rather than a pack itself, which Minecraft can't load. Returns the inner packs when `bytes`
 * is such a bundle — no root pack.mcmeta and only .zip files inside — otherwise undefined. */
export async function unbundlePacks(bytes: Uint8Array): Promise<BundledPack[] | undefined> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch {
    return undefined;
  }
  if (zip.file("pack.mcmeta")) return undefined;

  const files = Object.values(zip.files).filter((f) => !f.dir);
  if (files.length === 0 || !files.every((f) => f.name.toLowerCase().endsWith(".zip"))) return undefined;

  return Promise.all(files.map(async (f) => ({ name: basename(f.name), bytes: await f.async("uint8array") })));
}
