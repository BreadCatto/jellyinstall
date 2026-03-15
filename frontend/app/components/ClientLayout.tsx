"use client";

import { ThemeProvider } from "@/app/contexts/ThemeContext";
import { AuthProvider } from "@/app/contexts/AuthContext";
import { DownloadProvider } from "@/app/contexts/DownloadContext";
import Navbar from "./Navbar";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DownloadProvider>
          <Navbar />
          <main className="pt-16 min-h-screen">{children}</main>
        </DownloadProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
