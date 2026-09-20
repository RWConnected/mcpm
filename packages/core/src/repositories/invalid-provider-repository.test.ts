import {describe, expect, it} from "bun:test";
import {QuietIO} from "../testing/index.js";
import {InvalidProviderRepository} from "./invalid-provider-repository.js";

describe("InvalidProviderRepository", () => {
  it("warns and returns empty results without throwing", async () => {
    const io = new QuietIO();
    const repo = new InvalidProviderRepository("badprov", "missing basePath", io);

    await expect(repo.search()).resolves.toEqual([]);
    await expect(repo.find()).resolves.toBeUndefined();
    await expect(repo.getVersions()).resolves.toEqual([]);

    expect(io.messages.filter((m) => m.level === "warn")).toHaveLength(3);
    expect(io.messages[0]?.msg).toContain("badprov");
    expect(io.messages[0]?.msg).toContain("missing basePath");
  });
});
