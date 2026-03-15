import { describe, it, expect } from "bun:test";
import type { VersionResult } from "../models/repository.js";
import type { VersionSpec } from "../models/manifest.js";
import {
  isSemverRange,
  resolveVersion,
  satisfies,
  compareVersions,
} from "./semver.js";

function makeVersion(version: string, mcVersions: string[] = []): VersionResult {
  return {
    modId: "test",
    version,
    minecraftVersions: mcVersions,
    url: `https://example.invalid/${version}.jar`,
    hash: "fakehash",
  };
}

describe("isSemverRange", () => {
  it("returns true for ^ prefix", () => expect(isSemverRange("^1.0")).toBe(true));
  it("returns true for ~ prefix", () => expect(isSemverRange("~1.0")).toBe(true));
  it("returns true for > prefix", () => expect(isSemverRange(">1.0")).toBe(true));
  it("returns true for < prefix", () => expect(isSemverRange("<2.0")).toBe(true));
  it("returns true for *", () => expect(isSemverRange("*")).toBe(true));
  it("returns false for exact versions", () => expect(isSemverRange("1.0.0")).toBe(false));
  it("returns false for build metadata", () => expect(isSemverRange("2.0.0+1.21.5")).toBe(false));
  it("returns false for empty string", () => expect(isSemverRange("")).toBe(false));
});

describe("resolveVersion", () => {
  it("resolves caret range to highest matching version", () => {
    const versions = [
      makeVersion("1.0.0"),
      makeVersion("1.1.0"),
      makeVersion("1.2.0"),
      makeVersion("2.0.0"),
    ];
    const result = resolveVersion("^1.0.0", versions);
    expect(result).toBeDefined();
    expect(result!.version).toBe("1.2.0");
  });

  it("resolves tilde range", () => {
    const versions = [
      makeVersion("1.0.0"),
      makeVersion("1.0.5"),
      makeVersion("1.1.0"),
    ];
    const result = resolveVersion("~1.0.0", versions);
    expect(result).toBeDefined();
    expect(result!.version).toBe("1.0.5");
  });

  it("resolves wildcard to highest version", () => {
    const versions = [
      makeVersion("1.0.0"),
      makeVersion("2.0.0"),
      makeVersion("3.0.0"),
    ];
    const result = resolveVersion("*", versions);
    expect(result).toBeDefined();
    expect(result!.version).toBe("3.0.0");
  });

  it("returns undefined when no version matches", () => {
    const versions = [makeVersion("2.0.0")];
    const result = resolveVersion("^1.0.0", versions);
    expect(result).toBeUndefined();
  });

  it("resolves versions with only 2 parts (e.g., ^1.0)", () => {
    const versions = [
      makeVersion("1.0.0"),
      makeVersion("1.5.0"),
    ];
    const result = resolveVersion("^1.0", versions);
    expect(result).toBeDefined();
    expect(result!.version).toBe("1.5.0");
  });

  it("handles non-standard version strings with normalization", () => {
    // "v1.5.0" has leading non-digit prefix that gets stripped
    const versions = [makeVersion("v1.0.0"), makeVersion("v1.5.0")];
    const result = resolveVersion("^1.0.0", versions);
    expect(result).toBeDefined();
    expect(result!.version).toBe("v1.5.0");
  });

  it("falls back to exact match when semver fails", () => {
    const versions = [makeVersion("custom-version-string")];
    const result = resolveVersion("custom-version-string", versions);
    expect(result).toBeDefined();
    expect(result!.version).toBe("custom-version-string");
  });

  it("strips range operators in exact fallback", () => {
    const versions = [makeVersion("1.0.0")];
    const result = resolveVersion("^1.0.0", versions);
    // Should resolve via semver, but also works as exact fallback
    expect(result).toBeDefined();
    expect(result!.version).toBe("1.0.0");
  });
});

describe("satisfies", () => {
  it("exact spec matches only exact version", () => {
    const spec: VersionSpec = { kind: "exact", value: "1.0.0" };
    expect(satisfies(spec, "1.0.0")).toBe(true);
    expect(satisfies(spec, "1.0.1")).toBe(false);
  });

  it("range spec matches within range", () => {
    const spec: VersionSpec = { kind: "range", value: "^1.0.0" };
    expect(satisfies(spec, "1.0.0")).toBe(true);
    expect(satisfies(spec, "1.5.0")).toBe(true);
    expect(satisfies(spec, "2.0.0")).toBe(false);
  });

  it("exact spec with build metadata", () => {
    const spec: VersionSpec = { kind: "exact", value: "2.0.0+1.21.5" };
    expect(satisfies(spec, "2.0.0+1.21.5")).toBe(true);
    expect(satisfies(spec, "2.0.1+1.21.11")).toBe(false);
  });
});

describe("compareVersions", () => {
  it("compares standard semver versions", () => {
    expect(compareVersions("1.0.0", "2.0.0")).toBeLessThan(0);
    expect(compareVersions("2.0.0", "1.0.0")).toBeGreaterThan(0);
    expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
  });

  it("compares patch versions", () => {
    expect(compareVersions("1.0.0", "1.0.1")).toBeLessThan(0);
    expect(compareVersions("1.1.0", "1.0.5")).toBeGreaterThan(0);
  });

  it("valid semver is greater than invalid", () => {
    expect(compareVersions("1.0.0", "not-a-version")).toBeGreaterThan(0);
    expect(compareVersions("not-a-version", "1.0.0")).toBeLessThan(0);
  });

  it("two invalid versions compared lexicographically", () => {
    expect(compareVersions("aaa", "bbb")).toBeLessThan(0);
    expect(compareVersions("bbb", "aaa")).toBeGreaterThan(0);
  });

  it("handles versions with build metadata by normalizing", () => {
    expect(compareVersions("2.0.0+1.21.5", "2.0.1+1.21.11")).toBeLessThan(0);
  });
});
