export interface DownloadService {
  download(url: string, dest: string, expectedHash: string): Promise<void>;
}
