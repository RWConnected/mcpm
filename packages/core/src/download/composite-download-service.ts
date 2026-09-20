import type {DownloadService} from "./download-service.interface.js";

interface Route {
  readonly matches: (url: string) => boolean;
  readonly service: DownloadService;
}

/** Dispatches to a scheme-specific DownloadService (e.g. file://), falling back to a default. */
export class CompositeDownloadService implements DownloadService {
  constructor(
    private readonly routes: Route[],
    private readonly fallback: DownloadService,
  ) {}

  async download(url: string, dest: string, expectedHash: string, headers?: Record<string, string>): Promise<void> {
    const route = this.routes.find((r) => r.matches(url));
    const service = route?.service ?? this.fallback;
    await service.download(url, dest, expectedHash, headers);
  }
}
