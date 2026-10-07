// HTTP download service ported from src-tauri/src/app/modules/core/download/http.rs

import {mkdirSync, writeFileSync} from "fs";
import {dirname} from "path";
import type {DownloadService} from "./download-service.interface.js";
import {type HashFn, sha512Hex} from "../helpers/hash.js";

export class HttpDownloadService implements DownloadService {
  async download(url: string, dest: string, expectedHash: string, headers?: Record<string, string>, hashFn: HashFn = sha512Hex): Promise<void> {
    const response = await fetch(url, headers ? { headers } : undefined);
    if (!response.ok) {
      throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
    }

    const bytes = new Uint8Array(await response.arrayBuffer());

    const actual = await hashFn(bytes);
    if (actual !== expectedHash) {
      throw new Error(`Hash mismatch for ${dest}`);
    }

    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, bytes);
  }
}
