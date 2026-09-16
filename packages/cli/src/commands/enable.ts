import type {Command} from "commander";
import {Enable, type ModManager, type Provider} from "@mcpm/core";

export function registerEnable(program: Command, getManager: () => Promise<ModManager>): void {
  program
    .command("enable")
    .description("Re-enable a previously disabled mod")
    .argument("<slug>", "Mod slug")
    .argument("[provider]", "Provider (modrinth, curseforge, etc.)")
    .action(async (slug: string, provider: string | undefined) => {
      const manager = await getManager();
      const io = manager.io;
      try {
        const outcome = await Enable.run(manager, slug, provider as Provider | undefined);
        switch (outcome) {
          case "enabled":
            io.success(`Enabled mod '${slug}'. Run 'mcpm install' to download it into your mods folder.`);
            break;
          case "already-enabled":
            io.info(`Mod '${slug}' is already enabled`);
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
