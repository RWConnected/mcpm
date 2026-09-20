import type {Command} from "commander";
import {Install, type ModManager, Upgrade} from "@mcpm/core";

export function registerUpgrade(program: Command, getManager: () => Promise<ModManager>): void {
  program
    .command("upgrade")
    .description("Upgrade mods, datapacks, resourcepacks and shaderpacks to newer compatible versions")
    .argument("[mods...]", "Items to upgrade (id, slug or substring)")
    .option("--no-cache", "Skip cache")
    .option("--force-rehash", "Force re-verification of hashes")
    .option("--ignore-constraints", "Ignore version constraints")
    .option(
      "--disable-unresolved",
      "Disable mods that have no compatible version for the target Minecraft version instead of failing",
    )
    .option(
      "--enable-resolved",
      "Re-enable disabled mods that now have a compatible version for the target Minecraft version",
    )
    .action(async (mods: string[], opts) => {
      const manager = await getManager();
      const io = manager.io;
      try {
        const result = await Upgrade.runWithManager(
          manager,
          mods,
          opts.ignoreConstraints === true,
          opts.disableUnresolved === true,
          opts.enableResolved === true,
        );

        for (const key of result.disabled) {
          io.warn(
            `Disabled ${key}: no compatible version found for Minecraft ${manager.manifestService.manifest.minecraft_version}`,
          );
        }

        for (const key of result.enabled) {
          io.success(`Enabled ${key}: a compatible version was found`);
        }

        for (const key of result.stillUnresolved) {
          io.info(
            `${key} is disabled and still has no compatible version for Minecraft ${manager.manifestService.manifest.minecraft_version}`,
          );
        }

        if (
          result.upgraded.length === 0 &&
          result.disabled.length === 0 &&
          result.stillUnresolved.length === 0 &&
          result.enabled.length === 0
        ) {
          io.info("All selected mods are already up to date");
          return;
        }

        for (const [key, before, after] of result.upgraded) {
          io.success(`Upgraded ${key}: ${before ?? "-"} → ${after ?? "-"}`);
        }

        if (result.unchanged > 0) {
          io.info(`${result.unchanged} mod(s) were already up to date`);
        }

        await Install.runWithManager(manager, opts.noCache !== true, opts.forceRehash === true);
        io.success("All upgraded mods installed successfully.");
      } catch (e) {
        io.error(e instanceof Error ? e.message : String(e));
        process.exit(1);
      }
    });
}
