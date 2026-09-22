import {describe, expect, it} from "bun:test";
import {parseKind, splitSlugArg} from "./kind.js";

describe("parseKind", () => {
  it("accepts each valid kind", () => {
    expect(parseKind("mod")).toBe("mod");
    expect(parseKind("datapack")).toBe("datapack");
    expect(parseKind("resourcepack")).toBe("resourcepack");
    expect(parseKind("shaderpack")).toBe("shaderpack");
  });

  it("falls back to mod for anything unrecognized", () => {
    expect(parseKind("nonsense")).toBe("mod");
    expect(parseKind(undefined)).toBe("mod");
  });
});

describe("splitSlugArg", () => {
  it("passes through slug/provider unchanged when a provider arg is given", () => {
    expect(splitSlugArg("core", "vanillatweaks")).toEqual({ slug: "core", provider: "vanillatweaks" });
  });

  it("splits a combined provider:slug into parts when no provider arg is given", () => {
    expect(splitSlugArg("vanillatweaks:core", undefined)).toEqual({ provider: "vanillatweaks", slug: "core" });
  });

  it("leaves a bare slug (no colon) alone when no provider arg is given", () => {
    expect(splitSlugArg("sodium", undefined)).toEqual({ slug: "sodium" });
  });

  it("only splits on the first colon", () => {
    expect(splitSlugArg("local-url:mods/extra", undefined)).toEqual({ provider: "local-url", slug: "mods/extra" });
  });
});
