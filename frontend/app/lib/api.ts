const API_BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string> || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(data.detail || `Request failed: ${res.status}`);
  }

  return res.json();
}

// Auth
export const authApi = {
  checkSetup: () => request<{ setup_required: boolean }>("/auth/check-setup"),
  register: (username: string, password: string) =>
    request<{ token: string; username: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  login: (username: string, password: string) =>
    request<{ token: string; username: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  me: () => request<{ id: number; username: string }>("/auth/me"),
};

// TMDB
export const tmdbApi = {
  popularMovies: (page = 1) => request<{ results: any[]; total_pages: number }>(`/tmdb/popular/movies?page=${page}`),
  popularShows: (page = 1) => request<{ results: any[]; total_pages: number }>(`/tmdb/popular/shows?page=${page}`),
  trending: (type = "all") => request<{ results: any[] }>(`/tmdb/trending/${type}`),
  topRatedMovies: (page = 1) => request<{ results: any[] }>(`/tmdb/top-rated/movies?page=${page}`),
  topRatedShows: (page = 1) => request<{ results: any[] }>(`/tmdb/top-rated/shows?page=${page}`),
  movieDetails: (id: number) => request<any>(`/tmdb/movie/${id}`),
  showDetails: (id: number) => request<any>(`/tmdb/show/${id}`),
  movieCredits: (id: number) => request<{ cast: any[]; crew: any[] }>(`/tmdb/movie/${id}/credits`),
  showCredits: (id: number) => request<{ cast: any[]; crew: any[] }>(`/tmdb/show/${id}/credits`),
  showSeason: (id: number, season: number) => request<{ episodes: any[] }>(`/tmdb/show/${id}/season/${season}`),
  search: (q: string, page = 1) => request<{ results: any[]; total_pages: number }>(`/tmdb/search?q=${encodeURIComponent(q)}&page=${page}`),
};

// Streams
export const streamApi = {
  movieStreams: (imdbId: string) => request<{ streams: any[] }>(`/streams/movie/${imdbId}`),
  seriesStreams: (imdbId: string, season: number, episode: number) =>
    request<{ streams: any[] }>(`/streams/series/${imdbId}/${season}/${episode}`),
};

// Downloads
export const downloadApi = {
  start: (data: {
    url: string;
    title: string;
    filename: string;
    quality?: string;
    media_type?: string;
    file_size?: number;
    show_name?: string;
    season_number?: number;
  }) =>
    request<{ id: number; status: string; filename: string }>("/downloads/start", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  cancel: (id: number) =>
    request<{ id: number; status: string }>(`/downloads/${id}/cancel`, { method: "POST" }),
  history: () => request<any[]>("/downloads/history"),
};

// Admin
export const adminApi = {
  getSettings: () => request<{ movie_download_path: string; show_download_path: string }>("/admin/settings"),
  updateSettings: (data: { movie_download_path: string; show_download_path: string }) =>
    request<{ status: string }>("/admin/settings", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  diskUsage: () => request<Record<string, any>>("/admin/disk-usage"),
};


