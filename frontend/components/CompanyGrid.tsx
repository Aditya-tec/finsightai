"use client";

type Company = { ticker: string; name: string; sector: string };

type Props = {
  companies: Company[];
  selectedTicker?: string;
  onSelect: (company: Company) => void;
};

export default function CompanyGrid({ companies, selectedTicker, onSelect }: Props) {
  if (companies.length === 0) {
    return (
      <div className="terminal-card py-12 text-center text-sm muted">
        No companies found. Make sure the backend is running on port 8000.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {companies.map((c) => {
        const selected = selectedTicker === c.ticker;
        return (
          <button
            key={c.ticker}
            onClick={() => onSelect(c)}
            className={`group rounded-xl border p-4 text-left transition ${
              selected
                ? "border-[var(--accent)] bg-[rgba(53,240,138,0.1)] ring-1 ring-[rgba(53,240,138,0.4)]"
                : "border-[var(--border)] bg-[rgba(7,19,15,0.88)] hover:border-[var(--border-strong)] hover:bg-[rgba(9,24,18,0.92)]"
            }`}
          >
            <div className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)]">
              {c.name}
            </div>
            <div className="mt-1 font-mono text-xs text-[var(--accent)]">{c.ticker}</div>
            <div className="mt-2 text-xs text-[var(--text-secondary)]">{c.sector}</div>
          </button>
        );
      })}
    </div>
  );
}
