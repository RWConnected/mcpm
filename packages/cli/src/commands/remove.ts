import type { Command } from "commander";
import { Remove, type ModManager, type Provider } from "@mcpm/core";

export function registerRemove(program: Command, getManager: () => Promise<ModManager>): void {
  program
    .command("remove")
    .description("Remove a mod from the manifest")
    .argument("<slug>", "Mod slug")
    .argument("[provider]", "Provider (modrinth, curseforge, etc.)")
    .action(async (slug: string, provider: string | undefined) => {
      const manager = await getManager();
      const io = manager.io;
      try {
        const warning = await Remove.run(manager, slug, provider as Provider | undefined);
        if (warning) {
          io.warn(warning);
        } else {
          io.success(`Removed mod '${slug}' and updated lockfile`);
        }
      } catch (e) {
        io.error(e instanceof Error ? e.message : String(e));
        process.exit(1);
      }
    });
}
