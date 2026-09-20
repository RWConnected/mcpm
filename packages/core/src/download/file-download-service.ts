import {mkdirSync, readFileSync, writeFileSync} from "fs";
import {dirname} from "path";
import {fileURLToPath} from "url";
import {createHash} from "crypto";
import type {DownloadService} from "./download-service.interface.js";

/** Copies mods from local filesystem provider `file://` URLs, verifying hash like HttpDownloadService. */
export class FileDownloadService implements DownloadService {
  async download(url: string, dest: string, expectedHash: string): Promise<void> {
    const bytes = readFileSync(fileURLToPath(url));

    const actual = createHash("sha512").update(bytes).digest("hex");
    if (actual !== expectedHash) {
      throw new Error(`Hash mismatch for ${dest}`);
    }

    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, bytes);
  }
}
