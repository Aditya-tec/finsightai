"use client";

import { useEffect, useMemo, useState } from "react";

import CompanyGrid, { type Company } from "@/components/CompanyGrid";
import FadeSlideIn from "@/components/FadeSlideIn";
import TopBar from "@/components/TopBar";
import TypewriterText from "@/components/TypewriterText";
import { fetchCompanies } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/apiErrors";

const STAGGER = 0.09;

export default function Home() {
  const [query, setQuery] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [companiesError, setCompaniesError] = useState("");
  const [selected, setSelected] = useState<Company | null>(null);
  const [descTypingActive, setDescTypingActive] = useState(false);

  useEffect(() => {
    setCompaniesLoading(true);
    setCompaniesError("");
    fetchCompanies()
      .then(setCompanies)
      .catch((err) => {
        setCompanies([]);
        setCompaniesError(getApiErrorMessage(err, "companies"));
      })
      .finally(() => setCompaniesLoading(false));
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
        <FadeSlideIn delay={0}>
          <header className="hero">
            <div className="tag-row">
              <span className="tag tag-elevated">Nifty 20</span>
              <span className="tag tag-elevated">Agentic RAG</span>
              <span className="tag tag-elevated">Cited Reports</span>
            </div>
            <h1 className="hero-brand">
              <TypewriterText
                text="India's Nifty 20, decoded from real filings."
                startDelay={280}
                speed={34}
                onComplete={() => setDescTypingActive(true)}
              />
            </h1>
            <p className="hero-desc">
              <TypewriterText
                text="Ask any financial question or generate a cited 11-section report — pick a company below to start."
                active={descTypingActive}
                startDelay={180}
                speed={22}
              />
            </p>
          </header>
        </FadeSlideIn>

        <FadeSlideIn delay={STAGGER}>
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
        </FadeSlideIn>

        <FadeSlideIn delay={STAGGER * 2}>
          <section className="section-block">
            <div className="section-head">
              <span className="section-label">Nifty 20 Universe</span>
              <span className="section-count">{filtered.length} companies</span>
            </div>
            {companiesError ? (
              <div className="empty-state error-state panel-elevated">{companiesError}</div>
            ) : companiesLoading ? (
              <div className="empty-state panel-elevated">Loading companies…</div>
            ) : filtered.length === 0 ? (
              <div className="empty-state panel-elevated">No companies match your search.</div>
            ) : (
              <CompanyGrid companies={filtered} selected={selected} onSelect={setSelected} />
            )}
          </section>
        </FadeSlideIn>
      </main>
    </>
  );
}
