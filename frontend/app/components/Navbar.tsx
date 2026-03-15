"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "@/app/contexts/ThemeContext";
import { useAuth } from "@/app/contexts/AuthContext";
import { useDownloads } from "@/app/contexts/DownloadContext";
import { formatBytes } from "@/app/lib/types";

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { downloads, cancelDownload } = useDownloads();
  const [searchQuery, setSearchQuery] = useState("");
  const [showDownloads, setShowDownloads] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const downloadRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const activeDownloads = downloads.filter(
    (d) => d.status === "downloading" || d.status === "pending"
  );

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (downloadRef.current && !downloadRef.current.contains(e.target as Node)) {
        setShowDownloads(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search/?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl"
      style={{
        backgroundColor: theme === "dark" ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.85)",
        borderBottom: `1px solid var(--border)`,
      }}
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
            style={{
              backgroundColor: "var(--text-primary)",
              color: "var(--bg)",
            }}
          >
            JI
          </div>
          <span className="font-semibold text-lg hidden sm:block" style={{ color: "var(--text-primary)" }}>
            JellyInstall
          </span>
        </Link>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md mx-auto">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: "var(--text-tertiary)" }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search movies & shows..."
              className="w-full h-9 pl-10 pr-4 rounded-full text-sm outline-none transition-all"
              style={{
                backgroundColor: "var(--bg-surface)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
              }}
            />
          </div>
        </form>

        {/* Right section */}
        <div className="flex items-center gap-2">
          {/* Downloads */}
          <div className="relative" ref={downloadRef}>
            <button
              onClick={() => setShowDownloads(!showDownloads)}
              className="relative w-9 h-9 rounded-full flex items-center justify-center transition-colors"
              style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
            >
              <svg className="w-4 h-4" style={{ color: "var(--text-primary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {activeDownloads.length > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center"
                  style={{ backgroundColor: "var(--text-primary)", color: "var(--bg)" }}
                >
                  {activeDownloads.length}
                </span>
              )}
            </button>

            {showDownloads && (
              <div
                className="absolute right-0 top-12 w-96 rounded-xl overflow-hidden"
                style={{
                  backgroundColor: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  boxShadow: "var(--shadow-lg)",
                }}
              >
                <div className="p-3 font-semibold text-sm" style={{ borderBottom: "1px solid var(--border)" }}>
                  Downloads {activeDownloads.length > 0 && `(${activeDownloads.length} active)`}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {downloads.length === 0 ? (
                    <div className="p-6 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                      No active downloads
                    </div>
                  ) : (
                    downloads.map((d) => (
                      <div key={d.id} className="p-3" style={{ borderBottom: "1px solid var(--border)" }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                              {d.title}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                              {d.quality} {d.total_size > 0 && `- ${formatBytes(d.total_size)}`}
                            </p>
                          </div>
                          {(d.status === "downloading" || d.status === "pending") && (
                            <button
                              onClick={() => cancelDownload(d.id)}
                              className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:opacity-70"
                              style={{ backgroundColor: "var(--bg-surface)" }}
                            >
                              <svg className="w-3 h-3" style={{ color: "var(--text-primary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
                            <span>
                              {d.status === "downloading"
                                ? `${d.progress}% - ${d.speed_display}`
                                : d.status === "completed"
                                ? "Completed"
                                : d.status === "failed"
                                ? "Failed"
                                : d.status === "cancelled"
                                ? "Cancelled"
                                : "Pending..."}
                            </span>
                            <span>{d.total_size > 0 ? `${formatBytes(d.downloaded)} / ${formatBytes(d.total_size)}` : ""}</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-surface)" }}>
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${d.progress}%`,
                                backgroundColor:
                                  d.status === "completed"
                                    ? "#22c55e"
                                    : d.status === "failed"
                                    ? "#ef4444"
                                    : d.status === "cancelled"
                                    ? "#f59e0b"
                                    : "var(--text-primary)",
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
          >
            {theme === "dark" ? (
              <svg className="w-4 h-4" style={{ color: "var(--text-primary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" style={{ color: "var(--text-primary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* Admin link */}
          <Link
            href="/admin/"
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
          >
            <svg className="w-4 h-4" style={{ color: "var(--text-primary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>

          {/* User */}
          {user && (
            <div className="relative" ref={userRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-xs"
                style={{ backgroundColor: "var(--text-primary)", color: "var(--bg)" }}
              >
                {user.username.charAt(0).toUpperCase()}
              </button>
              {showUserMenu && (
                <div
                  className="absolute right-0 top-12 w-48 rounded-xl overflow-hidden"
                  style={{
                    backgroundColor: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    boxShadow: "var(--shadow-lg)",
                  }}
                >
                  <div className="p-3 text-sm" style={{ borderBottom: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                    Signed in as <strong style={{ color: "var(--text-primary)" }}>{user.username}</strong>
                  </div>
                  <button
                    onClick={logout}
                    className="w-full text-left p-3 text-sm transition-colors hover:opacity-70"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
