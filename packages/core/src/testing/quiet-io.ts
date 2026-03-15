import type { IO, PromptResult } from "../io/io.types.js";
import { promptResponse, promptCancel } from "../io/io.types.js";

export interface LogEntry {
  readonly level: string;
  readonly msg: string;
}

/** IO implementation for tests — captures messages, returns defaults for prompts */
export class QuietIO implements IO {
  readonly messages: LogEntry[] = [];

  debug(msg: string): void { this.messages.push({ level: "debug", msg }); }
  print(msg: string): void { this.messages.push({ level: "print", msg }); }
  info(msg: string): void { this.messages.push({ level: "info", msg }); }
  success(msg: string): void { this.messages.push({ level: "success", msg }); }
  warn(msg: string): void { this.messages.push({ level: "warn", msg }); }
  error(msg: string, _err?: Error): void { this.messages.push({ level: "error", msg }); }

  async prompt(_question: string, defaultValue?: string): Promise<PromptResult<string>> {
    return defaultValue !== undefined ? promptResponse(defaultValue) : promptCancel();
  }

  async confirm(_question: string, defaultValue: boolean): Promise<PromptResult<boolean>> {
    return promptResponse(defaultValue);
  }
}
