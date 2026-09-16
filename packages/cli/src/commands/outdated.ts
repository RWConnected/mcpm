import type {Command} from "commander";
import {type ModManager, Outdated} from "@mcpm/core";

export function registerOutdated(program: Command, getManager: () => Promise<ModManager>): void {
  program
    .command("outdated")
    .description("Check for outdated mods")
    .argument("[mods...]", "Mods to check (id, slug or substring)")
    .action(async (mods: string[]) => {
      const manager = await getManager();
      const io = manager.io;
      try {
        const result = await Outdated.run(manager, mods);

        if (result.outdated.length === 0) {
          io.success("All mods are up to date");
          return;
        }

        io.info(`Found ${result.outdated.length} outdated mod(s):\n`);
        console.log(
          `| ${"Mod".padEnd(30)} | ${"Current".padEnd(20)} | ${"Wanted".padEnd(20)} | ${"Latest".padEnd(20)} |`,
        );
        console.log("-".repeat(103));

        for (const entry of result.outdated) {
          const label = entry.disabled ? `${entry.key} (disabled)` : entry.key;
          console.log(
            `| ${label.padEnd(30)} | ${entry.current.padEnd(20)} | ${(entry.wanted ?? "-").padEnd(20)} | ${(entry.latest ?? "-").padEnd(20)} |`,
          );
        }

        for (const entry of result.outdated.filter((e) => e.disabled)) {
          io.warn(
            `${entry.key} is disabled but a compatible update is available: ${entry.current} -> ${entry.latest ?? entry.wanted}`,
          );
        }

        console.log(`\nChecked ${result.totalChecked} mods total`);
      } catch (e) {
        io.error(e instanceof Error ? e.message : String(e));
        process.exit(1);
      }
    });
}
