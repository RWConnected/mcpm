import type { Command } from "commander";
import type { ConfigPaths, IO, ModManager, RepositoryService } from "@mcpm/core";
import { registerInit } from "./init.js";
import { registerAdd } from "./add.js";
import { registerRemove } from "./remove.js";
import { registerInstall } from "./install.js";
import { registerUpgrade } from "./upgrade.js";
import { registerOutdated } from "./outdated.js";
import { registerList } from "./list.js";
import { registerSearch } from "./search.js";

export function registerCommands(
  program: Command,
  context: {
    getPaths: () => ConfigPaths;
    getIO: () => IO;
    getManager: () => Promise<ModManager>;
    getRepoService: () => RepositoryService;
  },
): void {
  registerInit(program, context.getPaths, context.getIO);
  registerAdd(program, context.getManager);
  registerRemove(program, context.getManager);
  registerInstall(program, context.getManager);
  registerUpgrade(program, context.getManager);
  registerOutdated(program, context.getManager);
  registerList(program, context.getManager);
  registerSearch(program, context.getRepoService, context.getIO);
}
