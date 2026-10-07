import {mkdirSync, writeFileSync} from "fs";
import {dirname} from "path";
import type {DownloadService} from "../download/download-service.interface.js";
import {type HashFn, sha512Hex} from "../helpers/hash.js";
import type {ModFactory} from "./mod-factory.js";

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

  /** URLs download() was called with, in order. */
  readonly downloadedUrls: string[] = [];

  async download(
    url: string,
    dest: string,
    expectedHash: string,
    _headers?: Record<string, string>,
    hashFn: HashFn = sha512Hex,
  ): Promise<void> {
    this.downloadedUrls.push(url);
    const bytes = this.content.get(url) ?? new TextEncoder().encode("default_content");
    const actual = await hashFn(bytes);
    if (actual !== expectedHash) {
      throw new Error(`Hash mismatch for ${dest}`);
    }
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, bytes);
  }
}
