import {describe, expect, it} from "bun:test";
import JSZip from "jszip";
import {unbundlePacks} from "./pack-bundle.js";

async function zipOf(files: Record<string, string | Uint8Array>): Promise<Uint8Array> {
  const zip = new JSZip();
  for (const [name, content] of Object.entries(files)) zip.file(name, content);
  return zip.generateAsync({ type: "uint8array" });
}

describe("unbundlePacks", () => {
  it("returns the inner packs of a zip that only contains zips", async () => {
    const inner = await zipOf({ "pack.mcmeta": "{}" });
    const bundle = await zipOf({ "armor statues.zip": inner, "nested/more mobs.zip": inner });

    const packs = await unbundlePacks(bundle);

    expect(packs?.map((p) => p.name).sort()).toEqual(["armor statues.zip", "more mobs.zip"]);
    expect(packs?.[0]?.bytes).toEqual(inner);
  });

  it("leaves a regular pack (root pack.mcmeta) alone", async () => {
    const pack = await zipOf({ "pack.mcmeta": "{}", "extra.zip": "x" });
    expect(await unbundlePacks(pack)).toBeUndefined();
  });

  it("leaves a zip with non-zip files alone", async () => {
    const zip = await zipOf({ "a.zip": "x", "readme.txt": "hi" });
    expect(await unbundlePacks(zip)).toBeUndefined();
  });

  it("returns undefined for bytes that aren't a zip", async () => {
    expect(await unbundlePacks(new TextEncoder().encode("not a zip"))).toBeUndefined();
  });
});
