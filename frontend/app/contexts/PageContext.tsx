"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

interface OverlayState {
  type: "movie" | "show";
  id: number;
}

interface PageContextValue {
  overlay: OverlayState | null;
  navigateTo: (type: "movie" | "show", id: number) => void;
  closeOverlay: () => void;
}

const PageContext = createContext<PageContextValue | null>(null);

export function usePage() {
  const ctx = useContext(PageContext);
  if (!ctx) throw new Error("usePage must be used inside PageProvider");
  return ctx;
}

export function PageProvider({ children }: { children: ReactNode }) {
  const [overlay, setOverlay] = useState<OverlayState | null>(null);

  // On mount, check if we're on a detail page directly (shared link)
  // In that case, don't show overlay — the static page handles it
  // Overlay is only for client-side navigation from other pages

  const navigateTo = useCallback((type: "movie" | "show", id: number) => {
    const path = type === "movie" ? `/movie/${id}/` : `/show/${id}/`;
    window.history.pushState({ overlay: true, type, id }, "", path);
    setOverlay({ type, id });
    // Scroll to top of overlay
    document.body.style.overflow = "hidden";
  }, []);

  const closeOverlay = useCallback(() => {
    setOverlay(null);
    document.body.style.overflow = "";
    window.history.back();
  }, []);

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state?.overlay) {
        setOverlay({ type: e.state.type, id: e.state.id });
        document.body.style.overflow = "hidden";
      } else {
        setOverlay(null);
        document.body.style.overflow = "";
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <PageContext.Provider value={{ overlay, navigateTo, closeOverlay }}>
      {children}
    </PageContext.Provider>
  );
}
