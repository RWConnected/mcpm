import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";
import { createHash } from "crypto";
import type { DownloadService } from "../download/download-service.interface.js";
import type { ModFactory } from "./mod-factory.js";

/** Fake download service for testing — writes pre-configured content, validates hashes */
export class FakeDownloadService implements DownloadService {
  private content = new Map<string, Uint8Array>();

  withMod(m: ModFactory): this {
    this.content.set(m.url, m.content);
    return this;
  }

  withContent(url: string, bytes: Uint8Array): this {
    this.content.set(url, bytes);
    return this;
  }

  async download(url: string, dest: string, expectedHash: string): Promise<void> {
    const bytes = this.content.get(url) ?? new TextEncoder().encode("default_content");
    const actual = createHash("sha512").update(bytes).digest("hex");
    if (actual !== expectedHash) {
      throw new Error(`Hash mismatch for ${dest}`);
    }
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, bytes);
  }
}
