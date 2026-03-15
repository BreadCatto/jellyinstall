"use client";

import { MediaItem, getTitle, getYear, posterUrl } from "@/app/lib/types";

interface MovieCardProps {
  item: MediaItem;
  type?: "movie" | "tv";
}

export default function MovieCard({ item, type }: MovieCardProps) {
  const mediaType = type || item.media_type || ("title" in item ? "movie" : "tv");
  const title = getTitle(item);
  const year = getYear(item);
  const rating = item.vote_average?.toFixed(1);
  const poster = posterUrl(item.poster_path, "w342");

  return (
    <a
      href={mediaType === "movie" ? `/movie/${item.id}/` : `/show/${item.id}/`}
      className="block group cursor-pointer"
    >
      <div className="card-hover rounded-xl overflow-hidden" style={{ backgroundColor: "var(--bg-surface)" }}>
        <div className="relative aspect-[2/3] overflow-hidden">
          {item.poster_path ? (
            <img
              src={poster}
              alt={title}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-sm"
              style={{ backgroundColor: "var(--bg-surface)", color: "var(--text-tertiary)" }}
            >
              No Poster
            </div>
          )}
          {/* Rating badge */}
          {rating && parseFloat(rating) > 0 && (
            <div
              className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-xs font-bold"
              style={{
                backgroundColor: "rgba(0,0,0,0.75)",
                color: "#ffffff",
                backdropFilter: "blur(4px)",
              }}
            >
              <span style={{ color: "#fbbf24", marginRight: "2px" }}>★</span>
              {rating}
            </div>
          )}
          {/* Type badge */}
          <div
            className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-xs font-medium uppercase tracking-wider"
            style={{
              backgroundColor: "rgba(0,0,0,0.75)",
              color: "#ffffff",
              backdropFilter: "blur(4px)",
            }}
          >
            {mediaType === "movie" ? "Movie" : "TV"}
          </div>
        </div>
        <div className="p-3">
          <h3
            className="font-semibold text-sm truncate"
            style={{ color: "var(--text-primary)" }}
          >
            {title}
          </h3>
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
            {year}
          </p>
        </div>
      </div>
    </a>
  );
}
