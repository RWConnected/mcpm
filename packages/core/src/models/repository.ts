// Models ported from src-tauri/src/app/modules/repositories/models.rs

import type { Side } from "./manifest.js";

export interface ModResult {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly source: string;
  readonly side: Side;
  readonly url: string;
}

export interface VersionResult {
  readonly modId: string;
  readonly version: string;
  readonly minecraftVersions: string[];
  readonly url: string;
  readonly hash: string;
}
