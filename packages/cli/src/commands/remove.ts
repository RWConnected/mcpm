import type {Command} from "commander";
import {type ModManager, type Provider, Remove} from "@mcpm/core";

export function registerRemove(program: Command, getManager: () => Promise<ModManager>): void {
  program
    .command("remove")
    .description("Remove a mod or datapack from the manifest")
    .argument("<slug>", "Mod/datapack slug")
    .argument("[provider]", "Provider (modrinth, curseforge, etc.)")
    .option("--type <type>", "Resource type: mod or datapack", "mod")
    .action(async (slug: string, provider: string | undefined, opts) => {
      const manager = await getManager();
      const io = manager.io;
      const kind = opts.type === "datapack" ? "datapack" : "mod";
      try {
        const warning = await Remove.run(manager, slug, provider as Provider | undefined, kind);
        if (warning) {
          io.warn(warning);
        } else {
          io.success(`Removed ${kind} '${slug}' and updated lockfile`);
        }
      } catch (e) {
        io.error(e instanceof Error ? e.message : String(e));
        process.exit(1);
      }
    });
}
