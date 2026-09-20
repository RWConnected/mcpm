// HTTP download service ported from src-tauri/src/app/modules/core/download/http.rs

import {mkdirSync, writeFileSync} from "fs";
import {dirname} from "path";
import {createHash} from "crypto";
import type {DownloadService} from "./download-service.interface.js";

export class HttpDownloadService implements DownloadService {
  async download(url: string, dest: string, expectedHash: string, headers?: Record<string, string>): Promise<void> {
    const response = await fetch(url, headers ? { headers } : undefined);
    if (!response.ok) {
      throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
    }

    const bytes = new Uint8Array(await response.arrayBuffer());

    const actual = createHash("sha512").update(bytes).digest("hex");
    if (actual !== expectedHash) {
      throw new Error(`Hash mismatch for ${dest}`);
    }

    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, bytes);
  }
}
