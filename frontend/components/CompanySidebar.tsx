"use client";

type Company = { ticker: string; name: string; sector: string };

type Props = {
  companies: Company[];
  selectedTicker?: string;
  query: string;
  onQueryChange: (q: string) => void;
  onSelect: (c: Company) => void;
};

export default function CompanySidebar({
  companies,
  selectedTicker,
  query,
  onQueryChange,
  onSelect,
}: Props) {
  return (
    <aside className="panel panel-left">
      <div className="sidebar-tabs">
        <button className="sidebar-tab active" type="button">
          COMPANIES
        </button>
        <button className="sidebar-tab" type="button">
          METRICS
        </button>
      </div>
      <div className="sidebar-search">
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="> search ticker..."
        />
      </div>
      <div className="company-list">
        {companies.length === 0 ? (
          <div className="feed-idle" style={{ padding: 14 }}>
            No companies loaded.
            <br />
            Start backend on :8000
          </div>
        ) : (
          companies.map((c) => (
            <button
              key={c.ticker}
              type="button"
              className={`company-item${selectedTicker === c.ticker ? " selected" : ""}`}
              onClick={() => onSelect(c)}
            >
              <div className="company-item-ticker">{c.ticker}</div>
              <div className="company-item-name">{c.name}</div>
              <div className="company-item-sector">{c.sector}</div>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
