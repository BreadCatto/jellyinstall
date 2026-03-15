"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { tmdbApi } from "@/app/lib/api";
import { MediaItem, backdropUrl, getTitle, getYear } from "@/app/lib/types";
import CategoryRow from "@/app/components/CategoryRow";
import LoadingSpinner from "@/app/components/LoadingSpinner";

export default function HomePage() {
  const [trending, setTrending] = useState<MediaItem[]>([]);
  const [popularMovies, setPopularMovies] = useState<MediaItem[]>([]);
  const [popularShows, setPopularShows] = useState<MediaItem[]>([]);
  const [topMovies, setTopMovies] = useState<MediaItem[]>([]);
  const [topShows, setTopShows] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Hero carousel state
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroTransition, setHeroTransition] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heroItems = trending.slice(0, 8); // Show up to 8 trending items in carousel

  useEffect(() => {
    Promise.all([
      tmdbApi.trending("all"),
      tmdbApi.popularMovies(),
      tmdbApi.popularShows(),
      tmdbApi.topRatedMovies(),
      tmdbApi.topRatedShows(),
    ])
      .then(([t, pm, ps, tm, ts]) => {
        setTrending(t.results || []);
        setPopularMovies(pm.results || []);
        setPopularShows(ps.results || []);
        setTopMovies(tm.results || []);
        setTopShows(ts.results || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const goToSlide = useCallback(
    (index: number) => {
      if (heroItems.length === 0) return;
      setHeroTransition(true);
      setTimeout(() => {
        setHeroIndex(index);
        setHeroTransition(false);
      }, 300);
    },
    [heroItems.length]
  );

  const nextSlide = useCallback(() => {
    if (heroItems.length === 0) return;
    goToSlide((heroIndex + 1) % heroItems.length);
  }, [heroIndex, heroItems.length, goToSlide]);

  const prevSlide = useCallback(() => {
    if (heroItems.length === 0) return;
    goToSlide((heroIndex - 1 + heroItems.length) % heroItems.length);
  }, [heroIndex, heroItems.length, goToSlide]);

  // Auto-slide every 10 seconds
  useEffect(() => {
    if (heroItems.length <= 1) return;
    timerRef.current = setInterval(nextSlide, 10000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [nextSlide, heroItems.length]);

  // Reset timer on manual interaction
  const handleManualSlide = (action: () => void) => {
    if (timerRef.current) clearInterval(timerRef.current);
    action();
    timerRef.current = setInterval(nextSlide, 10000);
  };

  const hero = heroItems[heroIndex];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="pb-12">
      {/* Hero Carousel Section */}
      {hero && (
        <div className="relative h-[70vh] min-h-[500px] w-full overflow-hidden">
          <div className="absolute inset-0">
            {hero.backdrop_path && (
              <img
                src={backdropUrl(hero.backdrop_path)}
                alt={getTitle(hero)}
                className="w-full h-full object-cover"
                style={{
                  opacity: heroTransition ? 0 : 1,
                  transition: "opacity 0.3s ease-in-out",
                }}
              />
            )}
            {/* Gradient overlays */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to top, var(--bg) 0%, transparent 50%), linear-gradient(to right, var(--bg) 0%, transparent 60%)",
              }}
            />
          </div>

          <div className="relative h-full max-w-[1400px] mx-auto px-4 sm:px-6 flex items-end pb-16">
            <div
              className="max-w-lg"
              style={{
                opacity: heroTransition ? 0 : 1,
                transform: heroTransition ? "translateY(10px)" : "translateY(0)",
                transition: "opacity 0.3s ease-in-out, transform 0.3s ease-in-out",
              }}
            >
              <div
                className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-4"
                style={{
                  backgroundColor: "var(--text-primary)",
                  color: "var(--bg)",
                }}
              >
                Trending Now
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
                {getTitle(hero)}
              </h1>
              <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                {getYear(hero)} {hero.vote_average && `  |  ★ ${hero.vote_average.toFixed(1)}`}
              </p>
              <p className="mt-3 text-sm leading-relaxed line-clamp-3" style={{ color: "var(--text-secondary)" }}>
                {hero.overview}
              </p>
              <div className="mt-6 flex gap-3">
                <a
                  href={`/${hero.media_type === "tv" ? "show" : "movie"}/${hero.id}/`}
                  className="px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                  style={{ backgroundColor: "var(--text-primary)", color: "var(--bg)" }}
                >
                  View Details
                </a>
              </div>
            </div>

            {/* Carousel Controls */}
            {heroItems.length > 1 && (
              <>
                {/* Arrow buttons */}
                <div className="absolute bottom-16 right-6 flex items-center gap-3">
                  <button
                    onClick={() => handleManualSlide(prevSlide)}
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:opacity-80"
                    style={{
                      backgroundColor: "rgba(0,0,0,0.5)",
                      backdropFilter: "blur(8px)",
                      border: "1px solid rgba(255,255,255,0.15)",
                    }}
                  >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleManualSlide(nextSlide)}
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:opacity-80"
                    style={{
                      backgroundColor: "rgba(0,0,0,0.5)",
                      backdropFilter: "blur(8px)",
                      border: "1px solid rgba(255,255,255,0.15)",
                    }}
                  >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* Dot indicators */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                  {heroItems.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => handleManualSlide(() => goToSlide(i))}
                      className="transition-all duration-300"
                      style={{
                        width: i === heroIndex ? "24px" : "8px",
                        height: "8px",
                        borderRadius: "4px",
                        backgroundColor: i === heroIndex ? "var(--text-primary)" : "rgba(255,255,255,0.4)",
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Category Rows */}
      <div className="max-w-[1400px] mx-auto mt-8">
        <CategoryRow title="Trending Today" items={trending} loading={loading} />
        <CategoryRow title="Popular Movies" items={popularMovies} type="movie" loading={loading} />
        <CategoryRow title="Popular TV Shows" items={popularShows} type="tv" loading={loading} />
        <CategoryRow title="Top Rated Movies" items={topMovies} type="movie" loading={loading} />
        <CategoryRow title="Top Rated TV Shows" items={topShows} type="tv" loading={loading} />
      </div>
    </div>
  );
}
