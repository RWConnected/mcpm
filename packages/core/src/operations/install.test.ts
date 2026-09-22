import {afterEach, beforeEach, describe, expect, it} from "bun:test";
import {existsSync} from "fs";
import {join} from "path";
import {
  FakeDownloadService,
  FakeRepository,
  LockfileFactory,
  ManifestFactory,
  ModFactory,
  TestContext,
} from "../testing/index.js";
import {ModManager} from "./mod-manager.js";
import {Install} from "./install.js";
import {RepositoryService} from "../repositories/repository-service.js";

function createManager(ctx: TestContext, repo: FakeRepository, dl: FakeDownloadService): ModManager {
  const repoService = new RepositoryService();
  repoService.addProvider("modrinth", repo);
  return new ModManager({
    config: ctx.config,
    paths: ctx.paths,
    io: ctx.io,
    downloadService: dl,
    repositoryService: repoService,
  });
}

describe("Install", () => {
  let ctx: TestContext;

  beforeEach(() => { ctx = new TestContext(); });
  afterEach(() => { ctx.cleanup(); });

  // Ported from install_spec.rs: install_removes_old_versions_when_package_updates
  it("removes old version files when package updates", async () => {
    const mcVersion = "1.21.11";
    const modId = "modrinth:mod";
    const v1 = ModFactory.create(modId, "1.0.0");
    const v2 = ModFactory.create(modId, "2.0.0");

    const repo = new FakeRepository().withVersion(v1).withVersion(v2);
    const dl = new FakeDownloadService().withMod(v1).withMod(v2);
    const manager = createManager(ctx, repo, dl);

    // Install v1
    LockfileFactory.create().withMod(v1).writeTo(ctx.paths);
    ManifestFactory.create(mcVersion).withMod(v1).writeTo(ctx.paths);
    await manager.load();

    await Install.runWithManager(manager, false, false);

    expect(existsSync(join(ctx.config.modsDir, v1.filename))).toBe(true);

    // Update to v2
    LockfileFactory.create().withMod(v2).writeTo(ctx.paths);
    ManifestFactory.create(mcVersion).withMod(v2).writeTo(ctx.paths);
    await manager.load();

    await Install.runWithManager(manager, false, false);

    expect(existsSync(join(ctx.config.modsDir, v2.filename))).toBe(true);
    expect(existsSync(join(ctx.config.modsDir, v1.filename))).toBe(false);
  });

  // Ported from install_spec.rs: install_removes_entries_not_in_manifest_from_lockfile_and_mods_folder
  it("removes entries not in manifest from lockfile and mods folder", async () => {
    const mcVersion = "1.21.11";
    const modA = ModFactory.create("modrinth:a", "1.0.0");
    const modB = ModFactory.create("modrinth:b", "1.0.0");
    modA.seedMod(ctx.config);
    modB.seedMod(ctx.config);

    const repo = new FakeRepository().withVersion(modA).withVersion(modB);
    const dl = new FakeDownloadService().withMod(modA).withMod(modB);
    const manager = createManager(ctx, repo, dl);

    // Lockfile has both mods, manifest only has mod_a
    LockfileFactory.create().withMod(modA).withMod(modB).writeTo(ctx.paths);
    ManifestFactory.create(mcVersion).withMod(modA).writeTo(ctx.paths);
    await manager.load();

    await Install.runWithManager(manager, false, false);

    // Reload to check disk state
    manager.lockService.load();

    expect(manager.lockService.lock.mods.has("modrinth:a")).toBe(true);
    expect(manager.lockService.lock.mods.has("modrinth:b")).toBe(false);

    expect(existsSync(join(ctx.config.modsDir, modA.filename))).toBe(true);
    expect(existsSync(join(ctx.config.modsDir, modB.filename))).toBe(false);
  });

  it("does not download a disabled mod and removes it if already present", async () => {
    const mcVersion = "1.21.11";
    const mod = ModFactory.create("modrinth:sodium", "1.0.0");
    mod.seedMod(ctx.config);

    const repo = new FakeRepository().withVersion(mod);
    const dl = new FakeDownloadService().withMod(mod);
    const manager = createManager(ctx, repo, dl);

    LockfileFactory.create().withMod(mod).writeTo(ctx.paths);
    ManifestFactory.create(mcVersion).withMod(mod).writeTo(ctx.paths);
    await manager.load();

    // Disable the mod directly on the loaded manifest, as `Disable.run` would.
    const spec = manager.manifestService.manifest.mods.get("modrinth:sodium")!;
    manager.manifestService.manifest.mods.delete("modrinth:sodium");
    manager.manifestService.manifest.mods.set("disabled:modrinth:sodium", spec);

    await Install.runWithManager(manager, false, false);

    expect(existsSync(join(ctx.config.modsDir, mod.filename))).toBe(false);
    // Lock entry is still refreshed/kept for update checks
    expect(manager.lockService.lock.mods.has("modrinth:sodium")).toBe(true);
  });

  it("does not abort install when a disabled mod has no compatible version", async () => {
    const mcVersion = "1.21.11";
    const disabledMod = ModFactory.create("modrinth:old-mod", "1.0.0").forMcVersions(["1.18.0"]);
    const okMod = ModFactory.create("modrinth:sodium", "1.0.0");

    const repo = new FakeRepository().withVersion(disabledMod);
    const dl = new FakeDownloadService().withMod(disabledMod).withMod(okMod);
    const manager = createManager(ctx, repo, dl);

    LockfileFactory.create().withMod(okMod).writeTo(ctx.paths);
    ManifestFactory.create(mcVersion).withMod(disabledMod).withMod(okMod).writeTo(ctx.paths);
    await manager.load();

    // Disable it directly on the loaded manifest, as `Disable.run` would.
    const spec = manager.manifestService.manifest.mods.get("modrinth:old-mod")!;
    manager.manifestService.manifest.mods.delete("modrinth:old-mod");
    manager.manifestService.manifest.mods.set("disabled:modrinth:old-mod", spec);

    await expect(Install.runWithManager(manager, false, false)).resolves.toBeUndefined();

    expect(existsSync(join(ctx.config.modsDir, okMod.filename))).toBe(true);
    expect(manager.lockService.lock.mods.has("modrinth:old-mod")).toBe(false);
  });

  it("installs datapacks into datapacksDir, independent of mods", async () => {
    const mcVersion = "1.21.11";
    const mod = ModFactory.create("modrinth:sodium", "1.0.0");
    const datapack = ModFactory.create("modrinth:vanilla-tweaks", "1.0.0", "datapack");

    const repo = new FakeRepository().withVersion(mod).withVersion(datapack);
    const dl = new FakeDownloadService().withMod(mod).withMod(datapack);
    const manager = createManager(ctx, repo, dl);

    LockfileFactory.create().withMod(mod).withDatapack(datapack).writeTo(ctx.paths);
    ManifestFactory.create(mcVersion).withMod(mod).withDatapack(datapack).writeTo(ctx.paths);
    await manager.load();

    await Install.runWithManager(manager, false, false);

    expect(existsSync(join(ctx.config.modsDir, mod.filename))).toBe(true);
    expect(existsSync(join(ctx.config.datapacksDir, datapack.filename))).toBe(true);
    expect(datapack.filename.endsWith(".zip")).toBe(true);
    // Datapack file must not leak into the mods directory or vice versa
    expect(existsSync(join(ctx.config.modsDir, datapack.filename))).toBe(false);
    expect(existsSync(join(ctx.config.datapacksDir, mod.filename))).toBe(false);
  });

  it("removes a datapack file when it's removed from the manifest", async () => {
    const mcVersion = "1.21.11";
    const datapack = ModFactory.create("modrinth:vanilla-tweaks", "1.0.0", "datapack");
    datapack.seedDatapack(ctx.config);

    const repo = new FakeRepository().withVersion(datapack);
    const dl = new FakeDownloadService().withMod(datapack);
    const manager = createManager(ctx, repo, dl);

    LockfileFactory.create().withDatapack(datapack).writeTo(ctx.paths);
    ManifestFactory.create(mcVersion).writeTo(ctx.paths); // not in manifest
    await manager.load();

    await Install.runWithManager(manager, false, false);
    manager.lockService.load();

    expect(manager.lockService.lock.datapacks.has("modrinth:vanilla-tweaks")).toBe(false);
    expect(existsSync(join(ctx.config.datapacksDir, datapack.filename))).toBe(false);
  });

  it("installs resourcepacks and shaderpacks into their own dirs, independent of mods/datapacks", async () => {
    const mcVersion = "1.21.11";
    const resourcepack = ModFactory.create("modrinth:faithful", "1.0.0", "resourcepack");
    const shaderpack = ModFactory.create("modrinth:complementary", "1.0.0", "shaderpack");

    const repo = new FakeRepository().withVersion(resourcepack).withVersion(shaderpack);
    const dl = new FakeDownloadService().withMod(resourcepack).withMod(shaderpack);
    const manager = createManager(ctx, repo, dl);

    LockfileFactory.create().withResourcepack(resourcepack).withShaderpack(shaderpack).writeTo(ctx.paths);
    ManifestFactory.create(mcVersion).withResourcepack(resourcepack).withShaderpack(shaderpack).writeTo(ctx.paths);
    await manager.load();

    await Install.runWithManager(manager, false, false);

    expect(existsSync(join(ctx.config.resourcepacksDir, resourcepack.filename))).toBe(true);
    expect(existsSync(join(ctx.config.shaderpacksDir, shaderpack.filename))).toBe(true);
    expect(existsSync(join(ctx.config.resourcepacksDir, shaderpack.filename))).toBe(false);
    expect(existsSync(join(ctx.config.shaderpacksDir, resourcepack.filename))).toBe(false);
    expect(existsSync(join(ctx.config.modsDir, resourcepack.filename))).toBe(false);
  });
});
