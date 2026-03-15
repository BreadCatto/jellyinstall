"use client";

import { CastMember, posterUrl } from "@/app/lib/types";

interface CastSectionProps {
  cast: CastMember[];
}

export default function CastSection({ cast }: CastSectionProps) {
  if (!cast || cast.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
        Cast
      </h2>
      <div className="scroll-container flex gap-4 overflow-x-auto pb-2">
        {cast.slice(0, 20).map((member) => (
          <div key={member.id} className="shrink-0 w-[120px] text-center">
            <div className="w-[120px] h-[120px] rounded-full overflow-hidden mx-auto" style={{ backgroundColor: "var(--bg-surface)" }}>
              {member.profile_path ? (
                <img
                  src={posterUrl(member.profile_path, "w185")}
                  alt={member.name}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-10 h-10" style={{ color: "var(--text-tertiary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </div>
            <p className="text-sm font-medium mt-2 truncate" style={{ color: "var(--text-primary)" }}>
              {member.name}
            </p>
            <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
              {member.character}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
