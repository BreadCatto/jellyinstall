"use client";

import { useRef } from "react";
import MovieCard from "./MovieCard";
import { MediaItem } from "@/app/lib/types";

interface CategoryRowProps {
  title: string;
  items: MediaItem[];
  type?: "movie" | "tv";
  loading?: boolean;
}

export default function CategoryRow({ title, items, type, loading }: CategoryRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (scrollRef.current) {
      const amount = scrollRef.current.clientWidth * 0.75;
      scrollRef.current.scrollBy({
        left: dir === "left" ? -amount : amount,
        behavior: "smooth",
      });
    }
  };

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4 px-4 sm:px-6">
        <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
          {title}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => scroll("left")}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
          >
            <svg className="w-4 h-4" style={{ color: "var(--text-primary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => scroll("right")}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
          >
            <svg className="w-4 h-4" style={{ color: "var(--text-primary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
      <div ref={scrollRef} className="scroll-container flex gap-4 overflow-x-auto px-4 sm:px-6 pb-2">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="shrink-0 w-[160px] sm:w-[185px]">
                <div className="skeleton aspect-[2/3] rounded-xl" />
                <div className="skeleton h-4 mt-3 w-3/4 rounded" />
                <div className="skeleton h-3 mt-2 w-1/2 rounded" />
              </div>
            ))
          : items.map((item) => (
              <div key={item.id} className="shrink-0 w-[160px] sm:w-[185px]">
                <MovieCard item={item} type={type} />
              </div>
            ))}
      </div>
    </section>
  );
}
