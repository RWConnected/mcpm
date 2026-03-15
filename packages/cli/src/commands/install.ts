import type { Command } from "commander";
import { Install, type ModManager } from "@mcpm/core";

export function registerInstall(program: Command, getManager: () => Promise<ModManager>): void {
  program
    .command("install")
    .description("Install or update all mods")
    .option("--no-cache", "Skip cache")
    .option("--force-rehash", "Force re-verification of hashes")
    .action(async (opts) => {
      const manager = await getManager();
      const io = manager.io;
      try {
        await Install.runWithManager(manager, opts.noCache === true, opts.forceRehash === true);
        io.success("Installation completed successfully");
      } catch (e) {
        io.error(e instanceof Error ? e.message : String(e));
        process.exit(1);
      }
    });
}
