export interface DownloadService {
  download(url: string, dest: string, expectedHash: string, headers?: Record<string, string>): Promise<void>;
}
