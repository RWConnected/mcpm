import type {Command} from "commander";
import {Enable, type ModManager, type Provider} from "@mcpm/core";

export function registerEnable(program: Command, getManager: () => Promise<ModManager>): void {
  program
    .command("enable")
    .description("Re-enable a previously disabled mod or datapack")
    .argument("<slug>", "Mod/datapack slug")
    .argument("[provider]", "Provider (modrinth, curseforge, etc.)")
    .option("--type <type>", "Resource type: mod or datapack", "mod")
    .action(async (slug: string, provider: string | undefined, opts) => {
      const manager = await getManager();
      const io = manager.io;
      const kind = opts.type === "datapack" ? "datapack" : "mod";
      try {
        const outcome = await Enable.run(manager, slug, provider as Provider | undefined, kind);
        switch (outcome) {
          case "enabled":
            io.success(`Enabled ${kind} '${slug}'. Run 'mcpm install' to download it into your ${kind === "datapack" ? "datapacks" : "mods"} folder.`);
            break;
          case "already-enabled":
            io.info(`${kind === "datapack" ? "Datapack" : "Mod"} '${slug}' is already enabled`);
            break;
          case "not-found":
            io.warn(`${kind === "datapack" ? "Datapack" : "Mod"} '${slug}' not found in manifest`);
            break;
        }
      } catch (e) {
        io.error(e instanceof Error ? e.message : String(e));
        process.exit(1);
      }
    });
}
