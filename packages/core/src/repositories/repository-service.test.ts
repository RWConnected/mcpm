import { describe, it, expect } from "bun:test";
import { RepositoryService } from "./repository-service.js";
import { FakeRepository } from "../testing/fake-repository.js";
import { ModFactory } from "../testing/mod-factory.js";

describe("RepositoryService", () => {
  describe("getVersions", () => {
    it("routes to correct provider by colon prefix", async () => {
      const mod = ModFactory.create("test", "1.0.0");
      const modrinthRepo = new FakeRepository().withVersion(mod);
      const curseforgeRepo = new FakeRepository();

      const service = new RepositoryService();
      service.addProvider("modrinth", modrinthRepo);
      service.addProvider("curseforge", curseforgeRepo);

      const results = await service.getVersions("modrinth:test", ["1.21.11"], ["fabric"]);
      expect(results).toHaveLength(1);
      expect(results[0].version).toBe("1.0.0");
    });

    it("defaults to modrinth when no prefix", async () => {
      const mod = ModFactory.create("test", "1.0.0");
      const modrinthRepo = new FakeRepository().withVersion(mod);

      const service = new RepositoryService();
      service.addProvider("modrinth", modrinthRepo);

      const results = await service.getVersions("test", ["1.21.11"], ["fabric"]);
      expect(results).toHaveLength(1);
    });

    it("returns empty when provider not found", async () => {
      const service = new RepositoryService();

      const results = await service.getVersions("unknown:test", ["1.21.11"], ["fabric"]);
      expect(results).toHaveLength(0);
    });

    it("strips provider prefix when querying", async () => {
      // The FakeRepository filters by minecraftVersions, but the cleanId should be "sodium" not "modrinth:sodium"
      const mod = ModFactory.create("sodium", "1.0.0"); // modId is "sodium"
      const repo = new FakeRepository().withVersion(mod);

      const service = new RepositoryService();
      service.addProvider("modrinth", repo);

      // getVersions passes cleanId "sodium" to the provider, which matches mod.modId "sodium"
      const results = await service.getVersions("modrinth:sodium", ["1.21.11"], ["fabric"]);
      expect(results).toHaveLength(1);
    });
  });

  describe("search", () => {
    it("aggregates results from all providers", async () => {
      const service = new RepositoryService();
      service.addProvider("modrinth", new FakeRepository());
      service.addProvider("curseforge", new FakeRepository());

      // FakeRepository.search returns empty, but this verifies no errors
      const results = await service.search("sodium", 0);
      expect(results).toHaveLength(0);
    });
  });

  describe("find", () => {
    it("tries all providers until found", async () => {
      const service = new RepositoryService();
      service.addProvider("modrinth", new FakeRepository()); // returns undefined
      service.addProvider("curseforge", new FakeRepository()); // returns undefined

      const result = await service.find("sodium");
      expect(result).toBeUndefined();
    });
  });
});
