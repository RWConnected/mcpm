import type { Command } from "commander";
import { Add, type ModManager, type Provider } from "@mcpm/core";

export function registerAdd(program: Command, getManager: () => Promise<ModManager>): void {
  program
    .command("add")
    .description("Add a mod to the manifest")
    .argument("<id>", "Mod ID or slug")
    .argument("[version]", "Version constraint")
    .option("--provider <provider>", "Provider (modrinth, curseforge, etc.)")
    .option("--exact", "Pin exact version instead of range")
    .option("--search", "Search and pick interactively")
    .action(async (id: string, version: string | undefined, opts) => {
      const manager = await getManager();
      const io = manager.io;
      try {
        await Add.run(manager, {
          id,
          version,
          provider: opts.provider as Provider | undefined,
          exact: opts.exact === true,
          search: opts.search === true,
        });
        io.success("Mod added successfully");
      } catch (e) {
        io.error(e instanceof Error ? e.message : String(e));
        process.exit(1);
      }
    });
}
