import type {Command} from "commander";
import {Disable, type ModManager, type Provider} from "@mcpm/core";

export function registerDisable(program: Command, getManager: () => Promise<ModManager>): void {
  program
    .command("disable")
    .description("Temporarily disable a mod or datapack (kept in the manifest, skipped on install)")
    .argument("<slug>", "Mod/datapack slug")
    .argument("[provider]", "Provider (modrinth, curseforge, etc.)")
    .option("--type <type>", "Resource type: mod or datapack", "mod")
    .action(async (slug: string, provider: string | undefined, opts) => {
      const manager = await getManager();
      const io = manager.io;
      const kind = opts.type === "datapack" ? "datapack" : "mod";
      try {
        const outcome = await Disable.run(manager, slug, provider as Provider | undefined, kind);
        switch (outcome) {
          case "disabled":
            io.success(`Disabled ${kind} '${slug}'. Run 'mcpm install' to remove it from your ${kind === "datapack" ? "datapacks" : "mods"} folder.`);
            break;
          case "already-disabled":
            io.info(`${kind === "datapack" ? "Datapack" : "Mod"} '${slug}' is already disabled`);
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
