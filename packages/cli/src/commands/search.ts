import type { Command } from "commander";
import { Search, type RepositoryService, type IO } from "@mcpm/core";

export function registerSearch(
  program: Command,
  getRepoService: () => RepositoryService,
  getIO: () => IO,
): void {
  program
    .command("search")
    .description("Search for mods")
    .argument("<query>", "Search query")
    .option("--page <page>", "Page number", "0")
    .action(async (query: string, opts) => {
      try {
        await Search.run(getRepoService(), getIO(), query, parseInt(opts.page, 10));
      } catch (e) {
        getIO().error(e instanceof Error ? e.message : String(e));
        process.exit(1);
      }
    });
}
