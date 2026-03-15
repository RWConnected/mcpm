import pc from "picocolors";
import type { IO, IOConfig, PromptResult } from "@mcpm/core";
import { promptResponse, promptCancel } from "@mcpm/core";

export class CliIO implements IO {
  constructor(private readonly cfg: IOConfig) {}

  private isInteractive(): boolean {
    return !this.cfg.quiet && process.stdin.isTTY === true && process.stdout.isTTY === true;
  }

  debug(msg: string): void {
    if (this.cfg.verbose) console.log(`${pc.bold(pc.magenta("[DEBUG]")).padEnd(16)}${msg}`);
  }

  print(msg: string): void {
    if (!this.cfg.quiet) console.log(`${"".padEnd(8)}${msg}`);
  }

  info(msg: string): void {
    if (!this.cfg.quiet) console.log(`${pc.bold(pc.blue("[INFO]")).padEnd(16)}${msg}`);
  }

  success(msg: string): void {
    if (!this.cfg.quiet) console.log(`${pc.bold(pc.green("[OK]")).padEnd(16)}${msg}`);
  }

  warn(msg: string): void {
    console.error(`${pc.bold(pc.yellow("[WARNING]")).padEnd(16)}${msg}`);
  }

  error(msg: string, err?: Error): void {
    const prefix = pc.bold(pc.red("[ERROR]"));
    if (err) console.error(`${prefix.padEnd(16)}${msg}: ${err.message}`);
    else console.error(`${prefix.padEnd(16)}${msg}`);
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
