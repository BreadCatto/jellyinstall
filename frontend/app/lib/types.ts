export interface Movie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids?: number[];
  genres?: Genre[];
  runtime?: number;
  tagline?: string;
  status?: string;
  imdb_id?: string;
  external_ids?: { imdb_id: string };
  production_companies?: ProductionCompany[];
  videos?: { results: Video[] };
  similar?: { results: Movie[] };
  media_type?: string;
}

export interface Show {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids?: number[];
  genres?: Genre[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  tagline?: string;
  status?: string;
  external_ids?: { imdb_id: string };
  seasons?: Season[];
  videos?: { results: Video[] };
  similar?: { results: Show[] };
  media_type?: string;
  episode_run_time?: number[];
}

export interface Genre {
  id: number;
  name: string;
}

export interface Season {
  id: number;
  season_number: number;
  name: string;
  overview: string;
  poster_path: string | null;
  episode_count: number;
  air_date: string;
}

export interface Episode {
  id: number;
  episode_number: number;
  season_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date: string;
  vote_average: number;
  runtime: number;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

export interface Video {
  key: string;
  name: string;
  site: string;
  type: string;
}

export interface ProductionCompany {
  id: number;
  name: string;
  logo_path: string | null;
}

export interface StreamOption {
  url: string;
  resolution: string;
  size_bytes: number;
  size_display: string;
  codec: string;
  audio: string;
  hdr: string;
  source: string;
  title: string;
  provider: string;
  raw_name: string;
}

export interface DownloadProgress {
  id: number;
  title: string;
  filename: string;
  media_type: string;
  quality: string;
  total_size: number;
  downloaded: number;
  progress: number;
  speed: number;
  speed_display: string;
  status: "pending" | "downloading" | "completed" | "failed" | "cancelled";
}

export interface DiskUsage {
  path: string;
  total: number;
  used: number;
  free: number;
  folder_size: number;
  total_display: string;
  used_display: string;
  free_display: string;
  folder_size_display: string;
  usage_percent: number;
}

export interface AdminSettings {
  movie_download_path: string;
  show_download_path: string;
}

export interface UserInfo {
  id: number;
  username: string;
}

export type MediaItem = (Movie | Show) & { media_type?: string };

export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export function posterUrl(path: string | null, size: string = "w500"): string {
  if (!path) return "/no-poster.svg";
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function backdropUrl(path: string | null, size: string = "original"): string {
  if (!path) return "";
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function getTitle(item: MediaItem): string {
  return (item as Movie).title || (item as Show).name || "Unknown";
}

export function getDate(item: MediaItem): string {
  return (item as Movie).release_date || (item as Show).first_air_date || "";
}

export function getYear(item: MediaItem): string {
  const date = getDate(item);
  return date ? date.substring(0, 4) : "";
}

export function formatRuntime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}


