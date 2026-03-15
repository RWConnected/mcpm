import type { ConfigPaths } from "../models/config.js";
import type { IO } from "../io/io.types.js";
import { ManifestService } from "../services/manifest-service.js";

export class Init {
  static run(paths: ConfigPaths, io: IO): void {
    const service = new ManifestService(paths, io);
    service.init();
    io.success("Initialization complete.");
  }
}
