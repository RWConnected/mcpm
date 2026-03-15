import type { Command } from "commander";
import { Init, type ConfigPaths, type IO } from "@mcpm/core";

export function registerInit(program: Command, getPaths: () => ConfigPaths, getIO: () => IO): void {
  program
    .command("init")
    .description("Initialize a new mcpm project")
    .action(() => {
      Init.run(getPaths(), getIO());
    });
}
