import type {Command} from "commander";
import {type ModManager, PROVIDER_TYPES, ProviderInit, type ProviderType, validateProviders} from "@mcpm/core";

export function registerProvider(program: Command, getManager: () => Promise<ModManager>): void {
  const provider = program.command("provider").description("Manage mod providers");

  provider
    .command("list")
    .description("List configured providers and their status")
    .action(async () => {
      const manager = await getManager();
      const { valid, invalid } = validateProviders(manager.manifestService.manifest.providers);

      manager.io.print("modrinth (built-in)");
      for (const config of valid) {
        manager.io.print(`${config.id} (${config.type})`);
      }
      for (const { config, reason } of invalid) {
        manager.io.warn(`${config.id} (${config.type}) - invalid: ${reason}`);
      }
    });

  provider
    .command("init")
    .description("Scaffold a new provider config into the manifest")
    .argument("<type>", `Provider type: ${PROVIDER_TYPES.join(", ")}`)
    .requiredOption("--id <id>", "Unique id for this provider")
    .option("--path <path>", "local: base directory to search (default: ./local-mods)")
    .option("--url-template <template>", "url: download URL template ({slug}/{version} placeholders)")
    .option("--owner <owner>", "github/gitlab: repo owner")
    .option("--repo <repo>", "github/gitlab: repo name")
    .option("--host <host>", "gitlab: self-hosted instance host")
    .action(async (type: string, opts) => {
      const manager = await getManager();
      const io = manager.io;
      if (!PROVIDER_TYPES.includes(type as ProviderType)) {
        io.error(`Unknown provider type '${type}'. Expected one of: ${PROVIDER_TYPES.join(", ")}`);
        process.exit(1);
      }
      try {
        const config = ProviderInit.run(manager, {
          id: opts.id,
          type: type as ProviderType,
          path: opts.path,
          urlTemplate: opts.urlTemplate,
          owner: opts.owner,
          repo: opts.repo,
          host: opts.host,
        });
        io.success(`Added provider '${config.id}' (${config.type}). Run 'mcpm provider list' to check it's fully configured.`);
      } catch (e) {
        io.error(e instanceof Error ? e.message : String(e));
        process.exit(1);
      }
    });
}
