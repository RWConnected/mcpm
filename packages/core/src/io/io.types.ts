// IO abstraction ported from src-tauri/src/app/modules/io/traits.rs

export interface IOConfig {
  readonly verbose: boolean;
  readonly quiet: boolean;
}

export type PromptResult<T> =
  | { readonly kind: "response"; readonly value: T }
  | { readonly kind: "cancel" };

export function promptResponse<T>(value: T): PromptResult<T> {
  return { kind: "response", value };
}

export function promptCancel<T>(): PromptResult<T> {
  return { kind: "cancel" };
}

export function unwrapPrompt<T>(result: PromptResult<T>): T {
  if (result.kind === "cancel") throw new Error("Unwrap on cancelled prompt");
  return result.value;
}

export function isPromptCancel<T>(result: PromptResult<T>): boolean {
  return result.kind === "cancel";
}

export interface Output {
  debug(msg: string): void;
  print(msg: string): void;
  info(msg: string): void;
  success(msg: string): void;
  warn(msg: string): void;
  error(msg: string, err?: Error): void;
}

export interface Input {
  prompt(question: string, defaultValue?: string): Promise<PromptResult<string>>;
  confirm(question: string, defaultValue: boolean): Promise<PromptResult<boolean>>;
}

export interface IO extends Output, Input {}
