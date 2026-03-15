"use client";

import { useEffect, useState } from "react";
import { tmdbApi } from "@/app/lib/api";
import { Show, CastMember, backdropUrl, posterUrl } from "@/app/lib/types";
import CastSection from "@/app/components/CastSection";
import SeasonEpisodeList from "@/app/components/SeasonEpisodeList";
import MovieCard from "@/app/components/MovieCard";
import LoadingSpinner from "@/app/components/LoadingSpinner";

interface ShowContentProps {
  overlayId?: number;
}

export default function ShowContent({ overlayId }: ShowContentProps) {
  // When used as overlay, overlayId is passed directly.
  // When used as a standalone page, read the real URL from window.location
  // (usePathname returns the static template path /show/_/ in static export during hydration)
  const [idFromPath] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const parts = window.location.pathname.split("/").filter(Boolean);
    return Number(parts[1]) || 0;
  });
  const id = overlayId || idFromPath;

  const [show, setShow] = useState<Show | null>(null);
  const [cast, setCast] = useState<CastMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setShow(null);
    setCast([]);
    Promise.all([tmdbApi.showDetails(id), tmdbApi.showCredits(id)])
      .then(([s, c]) => {
        setShow(s);
        setCast(c.cast || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!show) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p style={{ color: "var(--text-secondary)" }}>Show not found.</p>
      </div>
    );
  }

  const imdbId = show.external_ids?.imdb_id || "";
  const similar = show.similar?.results?.slice(0, 10) || [];
  const seasons = (show.seasons || []).filter((s) => s.season_number > 0);

  return (
    <div className="pb-12">
      {/* Backdrop */}
      <div className="relative h-[65vh] min-h-[450px] w-full overflow-hidden">
        {show.backdrop_path && (
          <img
            src={backdropUrl(show.backdrop_path)}
            alt={show.name}
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
              {show.poster_path ? (
                <img
                  src={posterUrl(show.poster_path, "w500")}
                  alt={show.name}
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
              {show.name}
            </h1>

            {show.tagline && (
              <p className="mt-2 text-lg italic" style={{ color: "var(--text-secondary)" }}>
                &ldquo;{show.tagline}&rdquo;
              </p>
            )}

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-3 mt-4">
              {show.first_air_date && (
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {new Date(show.first_air_date).getFullYear()}
                </span>
              )}
              {show.number_of_seasons && (
                <>
                  <span style={{ color: "var(--text-tertiary)" }}>|</span>
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {show.number_of_seasons} Season{show.number_of_seasons > 1 ? "s" : ""}
                  </span>
                </>
              )}
              {show.number_of_episodes && (
                <>
                  <span style={{ color: "var(--text-tertiary)" }}>|</span>
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {show.number_of_episodes} Episodes
                  </span>
                </>
              )}
              {show.vote_average > 0 && (
                <>
                  <span style={{ color: "var(--text-tertiary)" }}>|</span>
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    <span style={{ color: "#fbbf24" }}>★</span> {show.vote_average.toFixed(1)}
                    <span style={{ color: "var(--text-tertiary)" }}> ({show.vote_count.toLocaleString()} votes)</span>
                  </span>
                </>
              )}
              {show.status && (
                <>
                  <span style={{ color: "var(--text-tertiary)" }}>|</span>
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {show.status}
                  </span>
                </>
              )}
            </div>

            {/* Genres */}
            {show.genres && show.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {show.genres.map((g) => (
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
                {show.overview || "No overview available."}
              </p>
            </div>

            {!imdbId && (
              <div className="mt-4 p-3 rounded-lg text-sm" style={{ backgroundColor: "var(--bg-surface)", color: "var(--text-secondary)" }}>
                Download not available - no IMDB ID found for this show.
              </div>
            )}
          </div>
        </div>

        {/* Cast */}
        <CastSection cast={cast} />

        {/* Seasons & Episodes */}
        {imdbId && seasons.length > 0 && (
          <SeasonEpisodeList
            showId={id}
            imdbId={imdbId}
            seasons={seasons}
            showTitle={show.name}
          />
        )}

        {/* Similar Shows */}
        {similar.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
              Similar Shows
            </h2>
            <div className="scroll-container flex gap-4 overflow-x-auto pb-2">
              {similar.map((s) => (
                <div key={s.id} className="shrink-0 w-[160px]">
                  <MovieCard item={s} type="tv" />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
