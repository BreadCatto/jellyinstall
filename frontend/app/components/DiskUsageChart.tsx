"use client";

interface DiskUsageChartProps {
  label: string;
  path: string;
  usagePercent: number;
  usedDisplay: string;
  totalDisplay: string;
  freeDisplay: string;
  folderSizeDisplay: string;
}

export default function DiskUsageChart({
  label,
  path,
  usagePercent,
  usedDisplay,
  totalDisplay,
  freeDisplay,
  folderSizeDisplay,
}: DiskUsageChartProps) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (usagePercent / 100) * circumference;

  return (
    <div
      className="p-6 rounded-2xl"
      style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
    >
      <h3 className="font-semibold text-sm mb-1" style={{ color: "var(--text-primary)" }}>
        {label}
      </h3>
      <p className="text-xs truncate mb-4" style={{ color: "var(--text-tertiary)" }}>
        {path}
      </p>

      <div className="flex items-center gap-6">
        {/* Circle chart */}
        <div className="relative w-28 h-28 shrink-0">
          <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="var(--border)"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="var(--text-primary)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
              {usagePercent}%
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 space-y-2">
          <div className="flex justify-between text-sm">
            <span style={{ color: "var(--text-secondary)" }}>Used</span>
            <span className="font-medium" style={{ color: "var(--text-primary)" }}>{usedDisplay}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: "var(--text-secondary)" }}>Free</span>
            <span className="font-medium" style={{ color: "var(--text-primary)" }}>{freeDisplay}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: "var(--text-secondary)" }}>Total</span>
            <span className="font-medium" style={{ color: "var(--text-primary)" }}>{totalDisplay}</span>
          </div>
          <div
            className="flex justify-between text-sm pt-2 mt-2"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <span style={{ color: "var(--text-secondary)" }}>Folder Size</span>
            <span className="font-medium" style={{ color: "var(--text-primary)" }}>{folderSizeDisplay}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
