import { describe, it, expect } from "bun:test";
import { promptResponse, promptCancel, unwrapPrompt, isPromptCancel } from "./io.types.js";

describe("PromptResult", () => {
  it("response wraps a value", () => {
    const r = promptResponse("hello");
    expect(r.kind).toBe("response");
    expect(r.kind === "response" && r.value).toBe("hello");
  });

  it("cancel has no value", () => {
    const r = promptCancel<string>();
    expect(r.kind).toBe("cancel");
  });

  it("unwrap returns value for response", () => {
    expect(unwrapPrompt(promptResponse(42))).toBe(42);
  });

  it("unwrap throws for cancel", () => {
    expect(() => unwrapPrompt(promptCancel())).toThrow("Unwrap on cancelled prompt");
  });

  it("isPromptCancel returns true for cancel", () => {
    expect(isPromptCancel(promptCancel())).toBe(true);
    expect(isPromptCancel(promptResponse("x"))).toBe(false);
  });
});
