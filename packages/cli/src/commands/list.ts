import type { Command } from "commander";
import { List, type ModManager } from "@mcpm/core";

export function registerList(program: Command, getManager: () => Promise<ModManager>): void {
  program
    .command("list")
    .description("List installed mods")
    .action(async () => {
      const manager = await getManager();
      try {
        await List.run(manager);
      } catch (e) {
        manager.io.error(e instanceof Error ? e.message : String(e));
        process.exit(1);
      }
    });
}
