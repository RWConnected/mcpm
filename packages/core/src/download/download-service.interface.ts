import type {HashFn} from "../helpers/hash.js";

export interface DownloadService {
  /** `hashFn` computes the hash compared against `expectedHash`; defaults to sha512 hex of the bytes. */
  download(url: string, dest: string, expectedHash: string, headers?: Record<string, string>, hashFn?: HashFn): Promise<void>;
}
