// Stub GUI IO implementation — to be connected to Tauri/Vue frontend
import type { IO, PromptResult } from "@mcpm/core";
import { promptResponse, promptCancel } from "@mcpm/core";

export class GuiIO implements IO {
  debug(msg: string): void { console.log(`[DEBUG] ${msg}`); }
  print(msg: string): void { console.log(`        ${msg}`); }
  info(msg: string): void { console.log(`[INFO]  ${msg}`); }
  success(msg: string): void { console.log(`[OK]    ${msg}`); }
  warn(msg: string): void { console.error(`[WARN]  ${msg}`); }
  error(msg: string, err?: Error): void {
    console.error(err ? `[ERR]   ${msg}: ${err.message}` : `[ERR]   ${msg}`);
  }

  async prompt(_message: string, defaultValue?: string): Promise<PromptResult<string>> {
    // TODO: Implement GUI modal prompt
    return defaultValue !== undefined ? promptResponse(defaultValue) : promptCancel();
  }

  async confirm(_message: string, defaultValue: boolean): Promise<PromptResult<boolean>> {
    // TODO: Implement GUI modal confirm
    return promptResponse(defaultValue);
  }
}
