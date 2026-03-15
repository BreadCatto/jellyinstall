"use client";

import { useEffect, useState } from "react";
import { tmdbApi, streamApi } from "@/app/lib/api";
import { Movie, CastMember, StreamOption, backdropUrl, posterUrl, formatRuntime } from "@/app/lib/types";
import CastSection from "@/app/components/CastSection";
import DownloadModal from "@/app/components/DownloadModal";
import MovieCard from "@/app/components/MovieCard";
import LoadingSpinner from "@/app/components/LoadingSpinner";

interface MovieContentProps {
  overlayId?: number;
}

export default function MovieContent({ overlayId }: MovieContentProps) {
  // When used as overlay, overlayId is passed directly.
  // When used as a standalone page, read the real URL from window.location
  // (usePathname returns the static template path /movie/_/ in static export during hydration)
  const [idFromPath] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const parts = window.location.pathname.split("/").filter(Boolean);
    return Number(parts[1]) || 0;
  });
  const id = overlayId || idFromPath;

  const [movie, setMovie] = useState<Movie | null>(null);
  const [cast, setCast] = useState<CastMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDownload, setShowDownload] = useState(false);
  const [streams, setStreams] = useState<StreamOption[]>([]);
  const [loadingStreams, setLoadingStreams] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setMovie(null);
    setCast([]);
    Promise.all([tmdbApi.movieDetails(id), tmdbApi.movieCredits(id)])
      .then(([m, c]) => {
        setMovie(m);
        setCast(c.cast || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleOpenDownload = async () => {
    if (!movie) return;
    const imdbId = movie.imdb_id || movie.external_ids?.imdb_id;
    if (!imdbId) return;

    setShowDownload(true);
    setLoadingStreams(true);
    try {
      const data = await streamApi.movieStreams(imdbId);
      setStreams(data.streams);
    } catch {
      setStreams([]);
    } finally {
      setLoadingStreams(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p style={{ color: "var(--text-secondary)" }}>Movie not found.</p>
      </div>
    );
  }

  const imdbId = movie.imdb_id || movie.external_ids?.imdb_id;
  const similar = movie.similar?.results?.slice(0, 10) || [];

  return (
    <div className="pb-12">
      {/* Backdrop */}
      <div className="relative h-[65vh] min-h-[450px] w-full overflow-hidden">
        {movie.backdrop_path && (
          <img
            src={backdropUrl(movie.backdrop_path)}
            alt={movie.title}
            className="w-full h-full object-cover"
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, var(--bg) 0%, transparent 40%), linear-gradient(to right, var(--bg) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Content */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 -mt-64 relative z-10">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Poster */}
          <div className="shrink-0">
            <div className="w-64 rounded-2xl overflow-hidden" style={{ boxShadow: "var(--shadow-lg)" }}>
              {movie.poster_path ? (
                <img
                  src={posterUrl(movie.poster_path, "w500")}
                  alt={movie.title}
                  className="w-full aspect-[2/3] object-cover"
                />
              ) : (
                <div className="w-full aspect-[2/3] flex items-center justify-center" style={{ backgroundColor: "var(--bg-surface)" }}>
                  No Poster
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 fade-in">
            <h1 className="text-3xl sm:text-4xl font-bold" style={{ color: "var(--text-primary)" }}>
              {movie.title}
            </h1>

            {movie.tagline && (
              <p className="mt-2 text-lg italic" style={{ color: "var(--text-secondary)" }}>
                &ldquo;{movie.tagline}&rdquo;
              </p>
            )}

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-3 mt-4">
              {movie.release_date && (
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {new Date(movie.release_date).getFullYear()}
                </span>
              )}
              {movie.runtime && movie.runtime > 0 && (
                <>
                  <span style={{ color: "var(--text-tertiary)" }}>|</span>
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {formatRuntime(movie.runtime)}
                  </span>
                </>
              )}
              {movie.vote_average > 0 && (
                <>
                  <span style={{ color: "var(--text-tertiary)" }}>|</span>
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    <span style={{ color: "#fbbf24" }}>★</span> {movie.vote_average.toFixed(1)}
                    <span style={{ color: "var(--text-tertiary)" }}> ({movie.vote_count.toLocaleString()} votes)</span>
                  </span>
                </>
              )}
              {movie.status && (
                <>
                  <span style={{ color: "var(--text-tertiary)" }}>|</span>
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {movie.status}
                  </span>
                </>
              )}
            </div>

            {/* Genres */}
            {movie.genres && movie.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {movie.genres.map((g) => (
                  <span
                    key={g.id}
                    className="px-3 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: "var(--bg-surface)",
                      color: "var(--text-secondary)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            )}

            {/* Overview */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>
                Overview
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {movie.overview || "No overview available."}
              </p>
            </div>

            {/* Action buttons */}
            {imdbId && (
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={handleOpenDownload}
                  className="px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 flex items-center gap-2"
                  style={{ backgroundColor: "var(--text-primary)", color: "var(--bg)" }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Movie
                </button>
              </div>
            )}

            {/* Production Companies */}
            {movie.production_companies && movie.production_companies.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>
                  Production
                </h3>
                <div className="flex flex-wrap gap-2">
                  {movie.production_companies.map((c) => (
                    <span key={c.id} className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      {c.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cast */}
        <CastSection cast={cast} />

        {/* Similar Movies */}
        {similar.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
              Similar Movies
            </h2>
            <div className="scroll-container flex gap-4 overflow-x-auto pb-2">
              {similar.map((m) => (
                <div key={m.id} className="shrink-0 w-[160px]">
                  <MovieCard item={m} type="movie" />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Download Modal */}
      {showDownload && (
        <DownloadModal
          title={movie.title}
          streams={streams}
          loading={loadingStreams}
          mediaType="movie"
          onClose={() => {
            setShowDownload(false);
            setStreams([]);
          }}
        />
      )}
    </div>
  );
}
