import {createHash} from "crypto";

/** Hashes downloaded bytes into the form stored in the lockfile. */
export type HashFn = (bytes: Uint8Array) => Promise<string>;

export async function sha512Hex(bytes: Uint8Array): Promise<string> {
  return createHash("sha512").update(bytes).digest("hex");
}
