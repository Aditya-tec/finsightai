"use client";

import { useEffect, useMemo, useState } from "react";

import CompanyGrid, { type Company } from "@/components/CompanyGrid";
import TopBar from "@/components/TopBar";
import { fetchCompanies } from "@/lib/api";

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

  useEffect(() => {
    if (selected && !filtered.some((c) => c.ticker === selected.ticker)) {
      setSelected(null);
    }
  }, [filtered, selected]);

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
          <h1 className="hero-brand">
            India&apos;s Nifty 20, decoded from real filings.
          </h1>
          <p className="hero-desc">
            Ask any financial question or generate a cited 11-section report — pick a company
            below to start.
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
              placeholder="Search by name or ticker…"
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
            <CompanyGrid companies={filtered} selected={selected} onSelect={setSelected} />
          )}
        </section>
      </main>
    </>
  );
}
