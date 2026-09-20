import type {Command} from "commander";
import {type ModManager, type Provider, Remove} from "@mcpm/core";
import {KIND_LABEL, parseKind} from "../kind.js";

export function registerRemove(program: Command, getManager: () => Promise<ModManager>): void {
  program
    .command("remove")
    .description("Remove a mod, datapack, resourcepack or shaderpack from the manifest")
    .argument("<slug>", "Slug")
    .argument("[provider]", "Provider (modrinth, curseforge, etc.)")
    .option("--type <type>", "Resource type: mod, datapack, resourcepack or shaderpack", "mod")
    .action(async (slug: string, provider: string | undefined, opts) => {
      const manager = await getManager();
      const io = manager.io;
      const kind = parseKind(opts.type);
      try {
        const warning = await Remove.run(manager, slug, provider as Provider | undefined, kind);
        if (warning) {
          io.warn(warning);
        } else {
          io.success(`Removed ${KIND_LABEL[kind].toLowerCase()} '${slug}' and updated lockfile`);
        }
      } catch (e) {
        io.error(e instanceof Error ? e.message : String(e));
        process.exit(1);
      }
    });
}
