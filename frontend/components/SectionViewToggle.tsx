"use client";

import { Loader2, List } from "lucide-react";

type Props = {
  viewMode: "prose" | "bullets";
  loading: boolean;
  hasBullets: boolean;
  error?: string;
  onToggle: () => void;
};

export default function SectionViewToggle({
  viewMode,
  loading,
  hasBullets,
  error,
  onToggle,
}: Props) {
  const label =
    viewMode === "bullets" && hasBullets ? "Full Text" : "Bullet Points";

  return (
    <div className="report-section-toggle-wrap">
      <button
        type="button"
        className="report-section-toggle btn-ghost"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        disabled={loading}
        title={label}
      >
        {loading ? (
          <Loader2 size={14} className="report-section-toggle-spin" aria-hidden />
        ) : (
          <List size={14} aria-hidden />
        )}
        {loading ? "Generating..." : label}
      </button>
      {error && <span className="report-section-toggle-error">{error}</span>}
    </div>
  );
}
