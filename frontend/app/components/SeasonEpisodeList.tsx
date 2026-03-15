"use client";

import { useState, useEffect } from "react";
import { tmdbApi, streamApi } from "@/app/lib/api";
import { Episode, StreamOption, posterUrl } from "@/app/lib/types";
import DownloadModal from "./DownloadModal";

interface SeasonEpisodeListProps {
  showId: number;
  imdbId: string;
  seasons: { season_number: number; name: string; episode_count: number }[];
  showTitle: string;
}

export default function SeasonEpisodeList({ showId, imdbId, seasons, showTitle }: SeasonEpisodeListProps) {
  const [selectedSeason, setSelectedSeason] = useState(
    seasons.find((s) => s.season_number === 1)?.season_number ?? seasons[0]?.season_number ?? 0
  );
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadEpisode, setDownloadEpisode] = useState<{ season: number; episode: number; title: string } | null>(null);
  const [streams, setStreams] = useState<StreamOption[]>([]);
  const [loadingStreams, setLoadingStreams] = useState(false);

  useEffect(() => {
    if (selectedSeason === undefined) return;
    setLoading(true);
    tmdbApi
      .showSeason(showId, selectedSeason)
      .then((data) => setEpisodes(data.episodes || []))
      .catch(() => setEpisodes([]))
      .finally(() => setLoading(false));
  }, [showId, selectedSeason]);

  const handleEpisodeDownload = async (ep: Episode) => {
    setDownloadEpisode({
      season: ep.season_number,
      episode: ep.episode_number,
      title: `${showTitle} S${String(ep.season_number).padStart(2, "0")}E${String(ep.episode_number).padStart(2, "0")} - ${ep.name}`,
    });
    setLoadingStreams(true);
    try {
      const data = await streamApi.seriesStreams(imdbId, ep.season_number, ep.episode_number);
      setStreams(data.streams);
    } catch {
      setStreams([]);
    } finally {
      setLoadingStreams(false);
    }
  };

  // Filter out specials (season 0) unless that's the only season
  const filteredSeasons = seasons.filter((s) => s.season_number > 0 || seasons.length === 1);

  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
        Seasons & Episodes
      </h2>

      {/* Season tabs */}
      <div className="scroll-container flex gap-2 overflow-x-auto pb-3 mb-4">
        {filteredSeasons.map((s) => (
          <button
            key={s.season_number}
            onClick={() => setSelectedSeason(s.season_number)}
            className="shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all"
            style={{
              backgroundColor: selectedSeason === s.season_number ? "var(--text-primary)" : "var(--bg-surface)",
              color: selectedSeason === s.season_number ? "var(--bg)" : "var(--text-secondary)",
              border: `1px solid ${selectedSeason === s.season_number ? "var(--text-primary)" : "var(--border)"}`,
            }}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Episodes */}
      <div className="space-y-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton h-24 rounded-xl" />
            ))
          : episodes.map((ep) => (
              <div
                key={ep.id}
                className="flex gap-4 p-3 rounded-xl transition-colors"
                style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
              >
                {/* Episode still */}
                <div className="shrink-0 w-40 h-24 rounded-lg overflow-hidden" style={{ backgroundColor: "var(--bg-elevated)" }}>
                  {ep.still_path ? (
                    <img
                      src={posterUrl(ep.still_path, "w300")}
                      alt={ep.name}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: "var(--text-tertiary)" }}>
                      No Preview
                    </div>
                  )}
                </div>

                {/* Episode info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                        E{ep.episode_number}. {ep.name}
                      </h4>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                        {ep.air_date && new Date(ep.air_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                        {ep.runtime ? ` - ${ep.runtime}m` : ""}
                        {ep.vote_average > 0 && ` - ★ ${ep.vote_average.toFixed(1)}`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleEpisodeDownload(ep)}
                      className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      style={{
                        backgroundColor: "var(--text-primary)",
                        color: "var(--bg)",
                      }}
                    >
                      Download
                    </button>
                  </div>
                  <p className="text-xs mt-2 line-clamp-2" style={{ color: "var(--text-secondary)" }}>
                    {ep.overview || "No description available."}
                  </p>
                </div>
              </div>
            ))}
      </div>

      {/* Download Modal */}
      {downloadEpisode && (
        <DownloadModal
          title={downloadEpisode.title}
          streams={streams}
          loading={loadingStreams}
          mediaType="show"
          showName={showTitle}
          seasonNumber={downloadEpisode.season}
          onClose={() => {
            setDownloadEpisode(null);
            setStreams([]);
          }}
        />
      )}
    </section>
  );
}
