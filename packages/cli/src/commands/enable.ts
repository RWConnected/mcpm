import type {Command} from "commander";
import {Enable, type ModManager, type Provider} from "@mcpm/core";
import {KIND_FOLDER, KIND_LABEL, parseKind, splitSlugArg} from "../kind.js";

export function registerEnable(program: Command, getManager: () => Promise<ModManager>): void {
  program
    .command("enable")
    .description("Re-enable a previously disabled mod, datapack, resourcepack or shaderpack")
    .argument("<slug>", "Slug, or \"provider:slug\" as printed by `list`/`outdated`")
    .argument("[provider]", "Provider (modrinth, curseforge, etc.)")
    .option("--type <type>", "Resource type: mod, datapack, resourcepack or shaderpack", "mod")
    .action(async (slugArg: string, providerArg: string | undefined, opts) => {
      const manager = await getManager();
      const io = manager.io;
      const kind = parseKind(opts.type);
      const { slug, provider } = splitSlugArg(slugArg, providerArg);
      try {
        const outcome = await Enable.run(manager, slug, provider as Provider | undefined, kind);
        switch (outcome) {
          case "enabled":
            io.success(`Enabled ${KIND_LABEL[kind].toLowerCase()} '${slug}'. Run 'mcpm install' to download it into your ${KIND_FOLDER[kind]} folder.`);
            break;
          case "already-enabled":
            io.info(`${KIND_LABEL[kind]} '${slug}' is already enabled`);
            break;
          case "not-found":
            io.warn(`${KIND_LABEL[kind]} '${slug}' not found in manifest`);
            break;
        }
      } catch (e) {
        io.error(e instanceof Error ? e.message : String(e));
        process.exit(1);
      }
    });
}
