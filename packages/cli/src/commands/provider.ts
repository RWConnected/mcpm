import type {Command} from "commander";
import {type ModManager, validateProviders} from "@mcpm/core";

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
}
