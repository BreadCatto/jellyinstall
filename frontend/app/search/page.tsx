"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { tmdbApi } from "@/app/lib/api";
import { MediaItem } from "@/app/lib/types";
import MovieCard from "@/app/components/MovieCard";
import { Suspense } from "react";

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [results, setResults] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!query) return;
    setLoading(true);
    setPage(1);
    tmdbApi
      .search(query, 1)
      .then((data) => {
        const filtered = (data.results || []).filter(
          (r: any) => r.media_type === "movie" || r.media_type === "tv"
        );
        setResults(filtered);
        setTotalPages(data.total_pages || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [query]);

  const loadMore = () => {
    if (page >= totalPages) return;
    const nextPage = page + 1;
    setPage(nextPage);
    tmdbApi.search(query, nextPage).then((data) => {
      const filtered = (data.results || []).filter(
        (r: any) => r.media_type === "movie" || r.media_type === "tv"
      );
      setResults((prev) => [...prev, ...filtered]);
    });
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
        Search Results
      </h1>
      {query && (
        <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
          Showing results for &ldquo;{query}&rdquo;
        </p>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i}>
              <div className="skeleton aspect-[2/3] rounded-xl" />
              <div className="skeleton h-4 mt-3 w-3/4 rounded" />
              <div className="skeleton h-3 mt-2 w-1/2 rounded" />
            </div>
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-20" style={{ color: "var(--text-secondary)" }}>
          <svg className="w-16 h-16 mx-auto mb-4" style={{ color: "var(--text-tertiary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-lg font-medium">No results found</p>
          <p className="text-sm mt-1">Try a different search term.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {results.map((item) => (
              <MovieCard
                key={`${item.media_type}-${item.id}`}
                item={item}
                type={item.media_type === "tv" ? "tv" : "movie"}
              />
            ))}
          </div>

          {page < totalPages && (
            <div className="text-center mt-8">
              <button
                onClick={loadMore}
                className="px-8 py-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border)",
                }}
              >
                Load More
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
          <div className="skeleton h-8 w-48 rounded mb-8" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i}>
                <div className="skeleton aspect-[2/3] rounded-xl" />
                <div className="skeleton h-4 mt-3 w-3/4 rounded" />
              </div>
            ))}
          </div>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
