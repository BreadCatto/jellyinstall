"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from "react";
import { DownloadProgress } from "@/app/lib/types";
import { downloadApi } from "@/app/lib/api";

interface DownloadContextType {
  downloads: DownloadProgress[];
  startDownload: (data: {
    url: string;
    title: string;
    filename: string;
    quality?: string;
    media_type?: string;
    file_size?: number;
    show_name?: string;
    season_number?: number;
  }) => Promise<void>;
  cancelDownload: (id: number) => Promise<void>;
}

const DownloadContext = createContext<DownloadContextType>({
  downloads: [],
  startDownload: async () => {},
  cancelDownload: async () => {},
});

export function DownloadProvider({ children }: { children: ReactNode }) {
  const [downloads, setDownloads] = useState<DownloadProgress[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const connect = () => {
      const es = new EventSource("/api/downloads/active");
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const data: DownloadProgress[] = JSON.parse(event.data);
          setDownloads(data);
        } catch {}
      };

      es.onerror = () => {
        es.close();
        setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  const startDownload = useCallback(async (data: {
    url: string;
    title: string;
    filename: string;
    quality?: string;
    media_type?: string;
    file_size?: number;
    show_name?: string;
    season_number?: number;
  }) => {
    await downloadApi.start(data);
  }, []);

  const cancelDownload = useCallback(async (id: number) => {
    await downloadApi.cancel(id);
  }, []);

  return (
    <DownloadContext.Provider value={{ downloads, startDownload, cancelDownload }}>
      {children}
    </DownloadContext.Provider>
  );
}

export const useDownloads = () => useContext(DownloadContext);
