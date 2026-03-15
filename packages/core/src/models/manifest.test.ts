import { describe, it, expect } from "bun:test";
import {
  type ModEntry,
  versionSpecFromString,
  versionSpecToString,
  isSemverRange,
  defaultManifest,
  mergeManifest,
  modsAsEntries,
  modEntryToKey,
  insertModEntry,
  removeModEntry,
} from "./manifest.js";

describe("VersionSpec", () => {
  it("parses exact versions (no prefix)", () => {
    const spec = versionSpecFromString("1.2.3");
    expect(spec.kind).toBe("exact");
    expect(spec.value).toBe("1.2.3");
  });

  it("parses range versions with ^ prefix", () => {
    const spec = versionSpecFromString("^1.2.0");
    expect(spec.kind).toBe("range");
    expect(spec.value).toBe("^1.2.0");
  });

  it("parses range versions with ~ prefix", () => {
    const spec = versionSpecFromString("~1.0.0");
    expect(spec.kind).toBe("range");
    expect(spec.value).toBe("~1.0.0");
  });

  it("parses range versions with > prefix", () => {
    const spec = versionSpecFromString(">=1.18");
    expect(spec.kind).toBe("range");
    expect(spec.value).toBe(">=1.18");
  });

  it("parses range versions with < prefix", () => {
    const spec = versionSpecFromString("<2.0.0");
    expect(spec.kind).toBe("range");
    expect(spec.value).toBe("<2.0.0");
  });

  it("parses wildcard as range", () => {
    const spec = versionSpecFromString("*");
    expect(spec.kind).toBe("range");
    expect(spec.value).toBe("*");
  });

  it("parses version with build metadata as exact", () => {
    const spec = versionSpecFromString("2.0.0+1.21.5");
    expect(spec.kind).toBe("exact");
    expect(spec.value).toBe("2.0.0+1.21.5");
  });

  it("converts to string", () => {
    expect(versionSpecToString({ kind: "exact", value: "1.0.0" })).toBe("1.0.0");
    expect(versionSpecToString({ kind: "range", value: "^1.2.0" })).toBe("^1.2.0");
  });
});

describe("isSemverRange", () => {
  it("returns true for range prefixes", () => {
    expect(isSemverRange("^1.0")).toBe(true);
    expect(isSemverRange("~1.0")).toBe(true);
    expect(isSemverRange(">1.0")).toBe(true);
    expect(isSemverRange("<2.0")).toBe(true);
    expect(isSemverRange("*")).toBe(true);
  });

  it("returns false for exact versions", () => {
    expect(isSemverRange("1.0.0")).toBe(false);
    expect(isSemverRange("2.0.0+1.21.5")).toBe(false);
  });
});

describe("defaultManifest", () => {
  it("returns sensible defaults", () => {
    const m = defaultManifest();
    expect(m.name).toBe("My Modpack");
    expect(m.version).toBe("1.0.0");
    expect(m.side).toBe("both");
    expect(m.modloader).toBe("fabric");
    expect(m.minecraft_version).toBe("1.21.7");
    expect(m.default_provider).toBe("modrinth");
    expect(m.mods.size).toBe(0);
  });
});

describe("mergeManifest", () => {
  it("fills missing fields with defaults", () => {
    const m = mergeManifest({ name: "Custom Pack" });
    expect(m.name).toBe("Custom Pack");
    expect(m.version).toBe("1.0.0"); // default
    expect(m.modloader).toBe("fabric"); // default
  });

  it("preserves all provided fields", () => {
    const m = mergeManifest({
      name: "Test",
      version: "2.0.0",
      side: "client",
      modloader: "forge",
      minecraft_version: "1.20.1",
      default_provider: "curseforge",
    });
    expect(m.name).toBe("Test");
    expect(m.version).toBe("2.0.0");
    expect(m.side).toBe("client");
    expect(m.modloader).toBe("forge");
    expect(m.minecraft_version).toBe("1.20.1");
    expect(m.default_provider).toBe("curseforge");
  });
});

describe("modsAsEntries", () => {
  it("converts mod map to ModEntry array", () => {
    const m = defaultManifest();
    m.mods.set("modrinth:sodium", { kind: "range", value: "^0.6.0" });
    m.mods.set("curseforge:jei", { kind: "exact", value: "1.0.0" });

    const entries = modsAsEntries(m);
    expect(entries).toHaveLength(2);

    expect(entries[0].slug).toBe("sodium");
    expect(entries[0].provider).toBe("modrinth");
    expect(entries[0].version.kind).toBe("range");

    expect(entries[1].slug).toBe("jei");
    expect(entries[1].provider).toBe("curseforge");
    expect(entries[1].version.kind).toBe("exact");
  });

  it("uses default provider for unknown prefix", () => {
    const m = defaultManifest();
    m.mods.set("unknown:mod", { kind: "exact", value: "1.0.0" });

    const entries = modsAsEntries(m);
    expect(entries[0].provider).toBe("modrinth"); // default_provider
  });

  it("preserves insertion order", () => {
    const m = defaultManifest();
    m.mods.set("modrinth:z-mod", { kind: "exact", value: "1.0.0" });
    m.mods.set("modrinth:a-mod", { kind: "exact", value: "1.0.0" });
    m.mods.set("modrinth:m-mod", { kind: "exact", value: "1.0.0" });

    const entries = modsAsEntries(m);
    expect(entries[0].slug).toBe("z-mod");
    expect(entries[1].slug).toBe("a-mod");
    expect(entries[2].slug).toBe("m-mod");
  });
});

describe("modEntryToKey", () => {
  it("formats as provider:slug", () => {
    const entry: ModEntry = {
      slug: "sodium",
      version: { kind: "range", value: "^0.6.0" },
      provider: "modrinth",
    };
    expect(modEntryToKey(entry)).toBe("modrinth:sodium");
  });
});

describe("insertModEntry", () => {
  it("adds mod to manifest", () => {
    const m = defaultManifest();
    const entry: ModEntry = {
      slug: "sodium",
      version: { kind: "range", value: "^0.6.0" },
      provider: "modrinth",
    };
    insertModEntry(m, entry);
    expect(m.mods.has("modrinth:sodium")).toBe(true);
    expect(m.mods.get("modrinth:sodium")?.value).toBe("^0.6.0");
  });
});

describe("removeModEntry", () => {
  it("removes existing mod and returns true", () => {
    const m = defaultManifest();
    m.mods.set("modrinth:sodium", { kind: "range", value: "^0.6.0" });
    const result = removeModEntry(m, "modrinth", "sodium");
    expect(result).toBe(true);
    expect(m.mods.has("modrinth:sodium")).toBe(false);
  });

  it("returns false for non-existent mod", () => {
    const m = defaultManifest();
    const result = removeModEntry(m, "modrinth", "nonexistent");
    expect(result).toBe(false);
  });
});
