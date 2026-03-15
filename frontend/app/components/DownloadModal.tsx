"use client";

import { useState } from "react";
import { StreamOption } from "@/app/lib/types";
import { useDownloads } from "@/app/contexts/DownloadContext";
import { useAuth } from "@/app/contexts/AuthContext";
import LoadingSpinner from "./LoadingSpinner";

interface DownloadModalProps {
  title: string;
  streams: StreamOption[];
  loading: boolean;
  mediaType: "movie" | "show";
  onClose: () => void;
  showName?: string;
  seasonNumber?: number;
}

export default function DownloadModal({ title, streams, loading, mediaType, onClose, showName, seasonNumber }: DownloadModalProps) {
  const { startDownload } = useDownloads();
  const { user } = useAuth();
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleDownload = async (stream: StreamOption) => {
    if (!user) {
      setError("You must be logged in to download. Go to Admin page to sign in.");
      return;
    }

    setDownloading(stream.url);
    setError("");
    try {
      const ext = stream.title.match(/\.(\w{2,4})$/)?.[1] || "mkv";
      const filename = `${title} [${stream.resolution}] [${stream.codec || "x264"}].${ext}`;
      await startDownload({
        url: stream.url,
        title: title,
        filename: filename,
        quality: `${stream.resolution} ${stream.codec} ${stream.hdr}`.trim(),
        media_type: mediaType,
        file_size: stream.size_bytes,
        show_name: showName,
        season_number: seasonNumber,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to start download");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-2xl max-h-[80vh] rounded-2xl overflow-hidden flex flex-col fade-in"
        style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5" style={{ borderBottom: "1px solid var(--border)" }}>
          <div>
            <h3 className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>
              Download
            </h3>
            <p className="text-sm mt-0.5 max-w-md truncate" style={{ color: "var(--text-secondary)" }}>
              {title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ backgroundColor: "var(--bg-surface)" }}
          >
            <svg className="w-4 h-4" style={{ color: "var(--text-primary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-5 mt-4 p-3 rounded-lg text-sm" style={{ backgroundColor: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>
            {error}
          </div>
        )}

        {/* Stream list */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="md" />
            </div>
          ) : streams.length === 0 ? (
            <div className="text-center py-12" style={{ color: "var(--text-secondary)" }}>
              <svg className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--text-tertiary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
              </svg>
              <p className="font-medium">No sources found</p>
              <p className="text-sm mt-1">This title may not be available yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {streams.map((stream, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl transition-colors"
                  style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="px-2 py-0.5 rounded text-xs font-bold"
                          style={{ backgroundColor: "var(--text-primary)", color: "var(--bg)" }}
                        >
                          {stream.resolution}
                        </span>
                        {stream.hdr && (
                          <span
                            className="px-2 py-0.5 rounded text-xs font-medium"
                            style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
                          >
                            {stream.hdr}
                          </span>
                        )}
                        {stream.codec && (
                          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                            {stream.codec}
                          </span>
                        )}
                        {stream.audio && (
                          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                            {stream.audio}
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-1.5 truncate" style={{ color: "var(--text-secondary)" }}>
                        {stream.title}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        {stream.size_display && (
                          <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                            {stream.size_display}
                          </span>
                        )}
                        {stream.source && (
                          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                            {stream.source}
                          </span>
                        )}
                        {stream.provider && (
                          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                            {stream.provider}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0">
                      <button
                        onClick={() => handleDownload(stream)}
                        disabled={downloading === stream.url}
                        className="px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
                        style={{ backgroundColor: "var(--text-primary)", color: "var(--bg)" }}
                      >
                        {downloading === stream.url ? (
                          <span className="flex items-center gap-2">
                            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Starting...
                          </span>
                        ) : (
                          "Download"
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
