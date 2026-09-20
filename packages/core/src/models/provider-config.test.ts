import {describe, expect, it} from "bun:test";
import {type ProviderConfig, validateProviders} from "./provider-config.js";

describe("validateProviders", () => {
  it("accepts a well-formed config per type", () => {
    const providers: ProviderConfig[] = [
      { id: "local1", type: "local", basePath: "./mods" },
      { id: "url1", type: "url", urlTemplate: "https://example.com/{slug}/{version}.jar" },
      { id: "gh1", type: "github", owner: "rickiewars", repo: "gui-shop" },
      { id: "gl1", type: "gitlab", owner: "rickiewars", repo: "gui-shop" },
      { id: "vt1", type: "vanillatweaks", datapacks: { core: { "quality of life": ["armor statues"] } } },
    ];
    const { valid, invalid } = validateProviders(providers);
    expect(valid).toHaveLength(5);
    expect(invalid).toHaveLength(0);
  });

  it("rejects reserved ids", () => {
    const providers: ProviderConfig[] = [
      { id: "modrinth", type: "local", basePath: "./mods" },
      { id: "disabled", type: "local", basePath: "./mods" },
      { id: "curseforge", type: "local", basePath: "./mods" },
      { id: "github", type: "local", basePath: "./mods" },
      { id: "maven", type: "local", basePath: "./mods" },
    ];
    const { valid, invalid } = validateProviders(providers);
    expect(valid).toHaveLength(0);
    expect(invalid).toHaveLength(5);
    for (const { reason } of invalid) expect(reason).toContain("reserved");
  });

  it("rejects duplicate ids", () => {
    const providers: ProviderConfig[] = [
      { id: "dup", type: "local", basePath: "./a" },
      { id: "dup", type: "local", basePath: "./b" },
    ];
    const { valid, invalid } = validateProviders(providers);
    expect(valid).toHaveLength(1);
    expect(invalid).toHaveLength(1);
    expect(invalid[0]?.reason).toContain("duplicate");
  });

  it("rejects missing required fields per type", () => {
    const cases: ProviderConfig[] = [
      { id: "a", type: "local", basePath: "" },
      { id: "b", type: "url", urlTemplate: "" },
      { id: "c", type: "github", owner: "", repo: "x" },
      { id: "d", type: "gitlab", owner: "x", repo: "" },
    ];
    for (const config of cases) {
      const { valid, invalid } = validateProviders([config]);
      expect(valid).toHaveLength(0);
      expect(invalid).toHaveLength(1);
    }
  });

  it("rejects an unknown provider type", () => {
    const config = { id: "x", type: "ftp", host: "example.com" } as unknown as ProviderConfig;
    const { invalid } = validateProviders([config]);
    expect(invalid).toHaveLength(1);
    expect(invalid[0]?.reason).toContain("unknown provider type");
  });

  it("rejects an invalid regex in mcVersionPattern/assetPattern", () => {
    const configs: ProviderConfig[] = [
      { id: "a", type: "local", basePath: "./mods", mcVersionPattern: "(" },
      { id: "b", type: "url", urlTemplate: "https://x/{version}.jar", mcVersionPattern: "(" },
      { id: "c", type: "github", owner: "o", repo: "r", assetPattern: "(" },
    ];
    for (const config of configs) {
      const { invalid } = validateProviders([config]);
      expect(invalid).toHaveLength(1);
      expect(invalid[0]?.reason).toContain("regex");
    }
  });

  it("returns empty result for undefined providers", () => {
    const { valid, invalid } = validateProviders(undefined);
    expect(valid).toHaveLength(0);
    expect(invalid).toHaveLength(0);
  });

  it("rejects a vanillatweaks provider with no bundles at all", () => {
    const { invalid } = validateProviders([{ id: "vt1", type: "vanillatweaks" }]);
    expect(invalid).toHaveLength(1);
    expect(invalid[0]?.reason).toContain("missing datapacks or craftingtweaks bundles");
  });

  it("rejects a vanillatweaks provider with a bundle name shared between datapacks and craftingtweaks", () => {
    const { invalid } = validateProviders([
      {
        id: "vt1",
        type: "vanillatweaks",
        datapacks: { core: { qol: ["armor statues"] } },
        craftingtweaks: { core: { hermitcraft: ["silence hoppers"] } },
      },
    ]);
    expect(invalid).toHaveLength(1);
    expect(invalid[0]?.reason).toContain("core");
    expect(invalid[0]?.reason).toContain("both datapacks and craftingtweaks");
  });

  it("accepts a vanillatweaks provider with disjoint bundle names across datapacks and craftingtweaks", () => {
    const { valid, invalid } = validateProviders([
      {
        id: "vt1",
        type: "vanillatweaks",
        datapacks: { core: { qol: ["armor statues"] } },
        craftingtweaks: { tools: { hermitcraft: ["silence hoppers"] } },
      },
    ]);
    expect(valid).toHaveLength(1);
    expect(invalid).toHaveLength(0);
  });
});
