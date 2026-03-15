// Modrinth API response types ported from src-tauri/src/app/modules/repositories/modrinth/models.rs

export interface SearchResponse {
  hits: SearchItem[];
}

export interface SearchItem {
  author: string;
  categories: string[];
  client_side: string;
  color?: number;
  date_created: string;
  date_modified: string;
  description: string;
  display_categories: string[];
  downloads: number;
  featured_gallery?: string;
  follows: number;
  gallery: string[];
  icon_url?: string;
  latest_version: string;
  license: string;
  project_id: string;
  project_type: string;
  server_side: string;
  slug: string;
  title: string;
  versions: string[];
}

export interface FindResponse {
  id: string;
  slug: string;
  title: string;
  description: string;
  client_side: string;
  server_side: string;
  game_versions: string[];
}

export interface VersionItem {
  id: string;
  project_id: string;
  author_id: string;
  date_published: string;
  version_number: string;
  game_versions: string[];
  loaders: string[];
  files: VersionFile[];
  changelog?: string;
  dependencies: VersionDependency[];
  status: string;
  requested_status?: string;
}

export interface VersionFile {
  url: string;
  filename: string;
  primary: boolean;
  size: number;
  hashes: Record<string, string>;
}

export interface VersionDependency {
  project_id?: string;
  version_id?: string;
  dependency_type: string;
}
