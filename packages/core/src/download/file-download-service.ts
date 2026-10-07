import {mkdirSync, readFileSync, writeFileSync} from "fs";
import {dirname} from "path";
import {fileURLToPath} from "url";
import type {DownloadService} from "./download-service.interface.js";
import {type HashFn, sha512Hex} from "../helpers/hash.js";

/** Copies mods from local filesystem provider `file://` URLs, verifying hash like HttpDownloadService. */
export class FileDownloadService implements DownloadService {
  async download(url: string, dest: string, expectedHash: string, _headers?: Record<string, string>, hashFn: HashFn = sha512Hex): Promise<void> {
    const bytes = readFileSync(fileURLToPath(url));

    const actual = await hashFn(bytes);
    if (actual !== expectedHash) {
      throw new Error(`Hash mismatch for ${dest}`);
    }

    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, bytes);
  }
}
