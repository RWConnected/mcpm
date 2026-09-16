import type {Command} from "commander";
import {Disable, type ModManager, type Provider} from "@mcpm/core";

export function registerDisable(program: Command, getManager: () => Promise<ModManager>): void {
  program
    .command("disable")
    .description("Temporarily disable a mod (kept in the manifest, skipped on install)")
    .argument("<slug>", "Mod slug")
    .argument("[provider]", "Provider (modrinth, curseforge, etc.)")
    .action(async (slug: string, provider: string | undefined) => {
      const manager = await getManager();
      const io = manager.io;
      try {
        const outcome = await Disable.run(manager, slug, provider as Provider | undefined);
        switch (outcome) {
          case "disabled":
            io.success(`Disabled mod '${slug}'. Run 'mcpm install' to remove it from your mods folder.`);
            break;
          case "already-disabled":
            io.info(`Mod '${slug}' is already disabled`);
            break;
          case "not-found":
            io.warn(`Mod '${slug}' not found in manifest`);
            break;
        }
      } catch (e) {
        io.error(e instanceof Error ? e.message : String(e));
        process.exit(1);
      }
    });
}
