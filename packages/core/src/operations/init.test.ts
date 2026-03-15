import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, readFileSync } from "fs";
import { TestContext } from "../testing/index.js";
import { Init } from "./init.js";

describe("Init", () => {
  let ctx: TestContext;

  beforeEach(() => { ctx = new TestContext(); });
  afterEach(() => { ctx.cleanup(); });

  it("creates manifest file", () => {
    Init.run(ctx.paths, ctx.io);
    expect(existsSync(ctx.paths.manifestPath)).toBe(true);

    const content = JSON.parse(readFileSync(ctx.paths.manifestPath, "utf-8"));
    expect(content.name).toBeDefined();
    expect(content.mods).toBeDefined();
  });

  it("creates .gitignore with recommended entries", () => {
    Init.run(ctx.paths, ctx.io);
    expect(existsSync(ctx.paths.gitignorePath)).toBe(true);

    const content = readFileSync(ctx.paths.gitignorePath, "utf-8");
    expect(content).toContain("mods/");
    expect(content).toContain("crash-reports/");
    expect(content).toContain("logs/");
    expect(content).toContain("saves/");
  });

  it("emits success message", () => {
    Init.run(ctx.paths, ctx.io);

    const successMsgs = ctx.io.messages.filter((m) => m.level === "success");
    expect(successMsgs.length).toBeGreaterThanOrEqual(1);
    expect(successMsgs.some((m) => m.msg.includes("Initialization complete"))).toBe(true);
  });
});
