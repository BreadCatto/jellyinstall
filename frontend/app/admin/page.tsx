"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/contexts/AuthContext";
import { authApi, adminApi } from "@/app/lib/api";
import DiskUsageChart from "@/app/components/DiskUsageChart";

export default function AdminPage() {
  const { user, login, register, logout, loading: authLoading } = useAuth();
  const [setupRequired, setSetupRequired] = useState<boolean | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Settings
  const [moviePath, setMoviePath] = useState("");
  const [showPath, setShowPath] = useState("");
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsError, setSettingsError] = useState("");

  // Disk usage
  const [diskUsage, setDiskUsage] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    authApi.checkSetup().then((d) => setSetupRequired(d.setup_required)).catch(() => {});
  }, []);

  useEffect(() => {
    if (user) {
      loadSettings();
      loadDiskUsage();
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      const s = await adminApi.getSettings();
      setMoviePath(s.movie_download_path);
      setShowPath(s.show_download_path);
    } catch {}
  };

  const loadDiskUsage = async () => {
    try {
      const d = await adminApi.diskUsage();
      setDiskUsage(d);
    } catch {}
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSubmitting(true);
    try {
      if (setupRequired) {
        await register(username, password);
      } else {
        await login(username, password);
      }
      setSetupRequired(false);
    } catch (err: any) {
      setAuthError(err.message || "Authentication failed");
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsError("");
    setSettingsLoading(true);
    setSettingsSaved(false);
    try {
      await adminApi.updateSettings({ movie_download_path: moviePath, show_download_path: showPath });
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
      loadDiskUsage();
    } catch (err: any) {
      setSettingsError(err.message || "Failed to save settings");
    } finally {
      setSettingsLoading(false);
    }
  };

  if (authLoading || setupRequired === null) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        <div className="skeleton h-8 w-48 rounded mb-8" />
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div
          className="w-full max-w-md p-8 rounded-2xl fade-in"
          style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
        >
          <div className="text-center mb-8">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold"
              style={{ backgroundColor: "var(--text-primary)", color: "var(--bg)" }}
            >
              JI
            </div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
              {setupRequired ? "Create Account" : "Sign In"}
            </h1>
            <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
              {setupRequired
                ? "Set up the first admin account to get started."
                : "Sign in to access admin settings and downloads."}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full h-11 px-4 rounded-xl text-sm outline-none transition-all"
                style={{
                  backgroundColor: "var(--bg-elevated)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border)",
                }}
                required
                minLength={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 px-4 rounded-xl text-sm outline-none transition-all"
                style={{
                  backgroundColor: "var(--bg-elevated)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border)",
                }}
                required
                minLength={6}
              />
            </div>

            {authError && (
              <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={authSubmitting}
              className="w-full h-11 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
              style={{ backgroundColor: "var(--text-primary)", color: "var(--bg)" }}
            >
              {authSubmitting ? "Please wait..." : setupRequired ? "Create Account" : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Logged in - Admin Panel
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Admin Settings
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Manage download paths and view system stats.
          </p>
        </div>
        <button
          onClick={logout}
          className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          style={{ backgroundColor: "var(--bg-surface)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
        >
          Sign Out
        </button>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSaveSettings}>
        <div
          className="p-6 rounded-2xl mb-6"
          style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Download Paths
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>
                Movie Download Path
              </label>
              <input
                type="text"
                value={moviePath}
                onChange={(e) => setMoviePath(e.target.value)}
                placeholder="e.g., /media/movies or D:\Movies"
                className="w-full h-11 px-4 rounded-xl text-sm outline-none transition-all font-mono"
                style={{
                  backgroundColor: "var(--bg-elevated)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border)",
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>
                TV Show Download Path
              </label>
              <input
                type="text"
                value={showPath}
                onChange={(e) => setShowPath(e.target.value)}
                placeholder="e.g., /media/shows or D:\Shows"
                className="w-full h-11 px-4 rounded-xl text-sm outline-none transition-all font-mono"
                style={{
                  backgroundColor: "var(--bg-elevated)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border)",
                }}
              />
            </div>
          </div>

          {settingsError && (
            <div className="mt-4 p-3 rounded-lg text-sm" style={{ backgroundColor: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>
              {settingsError}
            </div>
          )}

          {settingsSaved && (
            <div className="mt-4 p-3 rounded-lg text-sm" style={{ backgroundColor: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}>
              Settings saved successfully!
            </div>
          )}

          <div className="mt-4">
            <button
              type="submit"
              disabled={settingsLoading}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
              style={{ backgroundColor: "var(--text-primary)", color: "var(--bg)" }}
            >
              {settingsLoading ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      </form>

      {/* Disk Usage */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Disk Usage
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {diskUsage?.movie_download_path ? (
            <DiskUsageChart
              label="Movies"
              path={diskUsage.movie_download_path.path}
              usagePercent={diskUsage.movie_download_path.usage_percent}
              usedDisplay={diskUsage.movie_download_path.used_display}
              totalDisplay={diskUsage.movie_download_path.total_display}
              freeDisplay={diskUsage.movie_download_path.free_display}
              folderSizeDisplay={diskUsage.movie_download_path.folder_size_display}
            />
          ) : (
            <div
              className="p-6 rounded-2xl flex items-center justify-center text-sm"
              style={{ backgroundColor: "var(--bg-surface)", color: "var(--text-secondary)", border: "1px solid var(--border)", minHeight: "160px" }}
            >
              Set a movie download path to see disk usage
            </div>
          )}
          {diskUsage?.show_download_path ? (
            <DiskUsageChart
              label="TV Shows"
              path={diskUsage.show_download_path.path}
              usagePercent={diskUsage.show_download_path.usage_percent}
              usedDisplay={diskUsage.show_download_path.used_display}
              totalDisplay={diskUsage.show_download_path.total_display}
              freeDisplay={diskUsage.show_download_path.free_display}
              folderSizeDisplay={diskUsage.show_download_path.folder_size_display}
            />
          ) : (
            <div
              className="p-6 rounded-2xl flex items-center justify-center text-sm"
              style={{ backgroundColor: "var(--bg-surface)", color: "var(--text-secondary)", border: "1px solid var(--border)", minHeight: "160px" }}
            >
              Set a TV show download path to see disk usage
            </div>
          )}
        </div>
      </div>

      {/* Help */}
      <div
        className="p-6 rounded-2xl"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
          CLI User Management
        </h2>
        <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
          Additional users can be created from the terminal:
        </p>
        <div
          className="p-3 rounded-lg font-mono text-sm"
          style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
        >
          python -m backend.app.manage create-user --username &lt;name&gt; --password &lt;pass&gt;
        </div>
      </div>
    </div>
  );
}
