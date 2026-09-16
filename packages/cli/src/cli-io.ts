import pc from "picocolors";
import type {IO, IOConfig, PromptResult} from "@mcpm/core";
import {promptCancel, promptResponse} from "@mcpm/core";

export class CliIO implements IO {
  constructor(private readonly cfg: IOConfig) {}

  private isInteractive(): boolean {
    return !this.cfg.quiet && process.stdin.isTTY === true && process.stdout.isTTY === true;
  }

  debug(msg: string): void {
    if (this.cfg.verbose) console.log(`${pc.bold(pc.magenta("[DEBUG]"))} ${msg}`);
  }

  print(msg: string): void {
    if (!this.cfg.quiet) console.log(msg);
  }

  info(msg: string): void {
    if (!this.cfg.quiet) console.log(`${pc.bold(pc.blue("[INFO]"))} ${msg}`);
  }

  success(msg: string): void {
    if (!this.cfg.quiet) console.log(`${pc.bold(pc.green("[OK]"))} ${msg}`);
  }

  warn(msg: string): void {
    console.error(`${pc.bold(pc.yellow("[WARNING]"))} ${msg}`);
  }

  error(msg: string, err?: Error): void {
    const prefix = pc.bold(pc.red("[ERROR]"));
    if (err) console.error(`${prefix} ${msg}: ${err.message}`);
    else console.error(`${prefix} ${msg}`);
  }

  async prompt(_question: string, defaultValue?: string): Promise<PromptResult<string>> {
    if (!this.isInteractive()) {
      return defaultValue !== undefined ? promptResponse(defaultValue) : promptCancel();
    }
    // Dynamic import to avoid pulling in @inquirer/prompts when not needed
    const { input } = await import("@inquirer/prompts");
    try {
      const value = await input({ message: _question, default: defaultValue });
      return promptResponse(value);
    } catch {
      return promptCancel();
    }
  }

  async confirm(_question: string, defaultValue: boolean): Promise<PromptResult<boolean>> {
    if (!this.isInteractive()) return promptResponse(defaultValue);
    const { confirm } = await import("@inquirer/prompts");
    try {
      const value = await confirm({ message: _question, default: defaultValue });
      return promptResponse(value);
    } catch {
      return promptCancel();
    }
  }
}
