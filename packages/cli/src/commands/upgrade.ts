import type { Command } from "commander";
import { Upgrade, Install, type ModManager } from "@mcpm/core";

export function registerUpgrade(program: Command, getManager: () => Promise<ModManager>): void {
  program
    .command("upgrade")
    .description("Upgrade mods to newer compatible versions")
    .argument("[mods...]", "Mods to upgrade (id, slug or substring)")
    .option("--no-cache", "Skip cache")
    .option("--force-rehash", "Force re-verification of hashes")
    .option("--ignore-constraints", "Ignore version constraints")
    .action(async (mods: string[], opts) => {
      const manager = await getManager();
      const io = manager.io;
      try {
        const result = await Upgrade.runWithManager(manager, mods, opts.ignoreConstraints === true);

        if (result.upgraded.length === 0) {
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
