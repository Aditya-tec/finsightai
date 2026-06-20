"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import TopBar from "@/components/TopBar";
import { fetchCompanies } from "@/lib/api";

type Company = { ticker: string; name: string; sector: string };

export default function Home() {
  const [query, setQuery] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selected, setSelected] = useState<Company | null>(null);

  useEffect(() => {
    fetchCompanies().then(setCompanies).catch(() => setCompanies([]));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter(
      (c) => c.name.toLowerCase().includes(q) || c.ticker.toLowerCase().includes(q)
    );
  }, [companies, query]);

  return (
    <>
      <TopBar />
      <main className="page">
        <header className="hero">
          <div className="tag-row">
            <span className="tag">Nifty 20</span>
            <span className="tag">Agentic RAG</span>
            <span className="tag">Cited Reports</span>
          </div>
          <h1>Equity research, grounded in filings.</h1>
          <p>
            Pick a company, ask any financial question, or generate a 5-section analyst
            report — every claim cited to source documents.
          </p>
        </header>

        <section className="section-block">
          <div className="section-head">
            <span className="section-label">Search Companies</span>
          </div>
          <div className="search-wrap">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="> search by name or ticker..."
              className="search-input"
            />
          </div>
        </section>

        <section className="section-block">
          <div className="section-head">
            <span className="section-label">Nifty 20 Universe</span>
            <span className="section-count">{filtered.length} companies</span>
          </div>
          {filtered.length === 0 ? (
            <div className="empty-state">No companies found. Make sure the backend is running.</div>
          ) : (
            <div className="company-grid">
              {filtered.map((c) => (
                <button
                  key={c.ticker}
                  type="button"
                  className={`company-card${selected?.ticker === c.ticker ? " selected" : ""}`}
                  onClick={() => setSelected(c)}
                >
                  <div className="company-card-ticker">{c.ticker}</div>
                  <div className="company-card-name">{c.name}</div>
                  <div className="company-card-sector">{c.sector}</div>
                </button>
              ))}
            </div>
          )}
        </section>

        {selected && (
          <section className="section-block">
            <div className="selected-bar">
              <div className="selected-bar-info">
                <strong>{selected.name}</strong>
                <div className="selected-bar-ticker">{selected.ticker}</div>
                <div className="selected-bar-sector">{selected.sector}</div>
              </div>
              <div className="selected-bar-actions">
                <Link href={`/chat?ticker=${selected.ticker}`} className="btn-green">
                  Ask a Question
                </Link>
                <Link href={`/report/${selected.ticker}`} className="btn-ghost">
                  Generate Report
                </Link>
              </div>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
