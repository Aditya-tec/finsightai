"use client";

import Link from "next/link";
import { FormEvent, use, useEffect, useLayoutEffect, useRef, useState } from "react";

import TopBar from "@/components/TopBar";
import { chatApi, fetchCompanies, reportApi } from "@/lib/api";
import { formatGroupedCitations } from "@/lib/citations";
import { exportReportPdf } from "@/lib/exportReportPdf";
import { buildConversationHistoryForApi, useReportStore } from "@/lib/reportStore";

function formatReportDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function isReportStale(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const ageDays = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
  return ageDays > 30;
}

export default function ReportPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = use(params);
  const { sections, followup, ticker: storedTicker, setReport, addFollowup, clear } = useReportStore();
  const showSections = storedTicker === ticker ? sections : [];
  const showFollowup = storedTicker === ticker ? followup : [];
  const [evalScores, setEvalScores] = useState<Record<string, unknown>>({});
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [followQuery, setFollowQuery] = useState("");
  const [followLoading, setFollowLoading] = useState(false);
  const [error, setError] = useState("");
  const [companies, setCompanies] = useState<Array<{ ticker: string; name: string }>>([]);
  const loadAbortRef = useRef<AbortController | null>(null);

  const formattedDate = formatReportDate(generatedAt);
  const staleReport = isReportStale(generatedAt);

  useLayoutEffect(() => {
    if (storedTicker !== ticker) {
      clear();
      setEvalScores({});
      setGeneratedAt(null);
      setFollowQuery("");
      setError("");
    }
  }, [ticker, storedTicker, clear]);

  useEffect(() => {
    fetchCompanies()
      .then((list) => setCompanies(list))
      .catch(() => setCompanies([]));
  }, []);

  async function fetchReport(forceRefresh: boolean) {
    const hadReport = showSections.length > 0 && storedTicker === ticker;

    loadAbortRef.current?.abort();

    const controller = new AbortController();
    loadAbortRef.current = controller;

    setLoading(true);
    setError("");

    try {
      const res = await reportApi({ ticker, force_refresh: forceRefresh }, controller.signal);
      setReport(ticker, res.sections);
      setEvalScores(res.eval_scores);
      setGeneratedAt(res.generated_at ?? null);
    } catch (err) {
      if (controller.signal.aborted) return;
      const ax = err as { message?: string; response?: { status?: number; data?: { detail?: string } } };
      if (ax.response?.status === 429) {
        if (forceRefresh && hadReport) {
          setError("Rate limit reached — showing last cached version");
        } else {
          setError(ax.response.data?.detail ?? "Groq rate limit reached — wait a few minutes and retry.");
        }
      } else if (ax.response?.data?.detail) {
        setError(String(ax.response.data.detail));
      } else if (ax.message?.toLowerCase().includes("timeout")) {
        setError("Report timed out — try again in a minute.");
      } else {
        setError("Could not reach the backend. Make sure uvicorn is running on port 8000, then refresh and retry.");
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    fetchReport(false);
    return () => {
      loadAbortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker]);

  function onRegenerate() {
    const ok = window.confirm(
      "This runs live Groq API calls (~60–90 seconds) and may use your daily quota. Continue?"
    );
    if (!ok) return;
    fetchReport(true);
  }

  async function onFollowUp(e: FormEvent) {
    e.preventDefault();
    if (!followQuery.trim()) return;
    setFollowLoading(true);
    const q = followQuery;
    setFollowQuery("");
    addFollowup({ role: "user", content: q });
    try {
      const res = await chatApi({
        query: q,
        ticker,
        conversation_history: buildConversationHistoryForApi(showSections, showFollowup),
      });
      addFollowup({ role: "assistant", content: res.answer, citations: res.citations });
    } catch (err) {
      const ax = err as { response?: { status?: number; data?: { detail?: string } } };
      const detail =
        ax.response?.status === 429
          ? "Rate limit reached — wait a few minutes and try again."
          : ax.response?.data?.detail ?? "Could not get a chat response. Check that the backend is running.";
      addFollowup({ role: "assistant", content: detail });
    } finally {
      setFollowLoading(false);
    }
  }

  function exportPdf() {
    exportReportPdf({
      ticker,
      companyName: companies.find((c) => c.ticker === ticker)?.name,
      sections: showSections,
      evalScores,
    });
  }

  const evalEntries = Object.entries(evalScores).filter(([k]) => k !== "grade");

  return (
    <>
      <TopBar
        action={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              disabled={loading}
              onClick={onRegenerate}
              className={loading ? "btn-generating" : "btn-ghost"}
              style={{ padding: "7px 14px" }}
              title="Runs live Groq API calls (~60–90s) and may use daily quota"
            >
              {loading ? "Generating..." : "Regenerate"}
            </button>
            <button
              disabled={loading || showSections.length === 0}
              onClick={exportPdf}
              className="btn-ghost"
              style={{ padding: "7px 14px" }}
            >
              Export PDF
            </button>
            <span className="tag">{ticker}</span>
          </div>
        }
      />
      <main className="page-wide">
        <Link href="/" className="back-link">
          ← companies
        </Link>

        <header className="page-header">
          <div className="page-header-row">
            <div>
              <h1>{ticker} · Equity Report</h1>
              <p>11-section analyst report with citations, eval scores, and follow-up chat.</p>
              {formattedDate && storedTicker === ticker && (
                <p className="report-meta">
                  Report last updated: {formattedDate}
                  {staleReport ? " (may be outdated)" : ""}
                </p>
              )}
            </div>
            {evalScores.grade != null && storedTicker === ticker && (
              <span className="grade-badge">Grade {String(evalScores.grade)}</span>
            )}
          </div>
        </header>

        {showSections.length > 0 && storedTicker === ticker && (
          <div className="panel report-followup-wide">
            <div className="report-followup-bar">
              <span className="report-followup-title">Follow-up Chat</span>
              <form onSubmit={onFollowUp} className="report-followup-form">
                <input
                  value={followQuery}
                  onChange={(e) => setFollowQuery(e.target.value)}
                  className="input-line"
                  placeholder="> ask about this report..."
                  disabled={followLoading}
                />
                <button disabled={followLoading || loading} className="btn-green report-followup-send">
                  {followLoading ? "..." : "Send"}
                </button>
              </form>
            </div>
            {showFollowup.length > 0 && (
              <div className="report-followup-messages">
                {showFollowup.map((m, i) => (
                  <div key={`${m.role}-${i}`} className={`chat-msg ${m.role}`}>
                    <div className="chat-msg-role">{m.role}</div>
                    {m.content}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="panel" style={{ marginTop: 16, borderColor: "var(--red, #e55)" }}>
            <div className="panel-body" style={{ color: "var(--red, #e55)" }}>
              {error}
            </div>
          </div>
        )}

        <div className="report-layout" style={{ marginTop: 24 }}>
          <div>
            {loading && showSections.length === 0 ? (
              <div className="panel">
                <div className="panel-body answer-placeholder">Generating report sections...</div>
              </div>
            ) : showSections.length > 0 ? (
              showSections.map((section, i) => (
                <div key={section.title} className="report-section" id={`section-${i}`}>
                  <div className="report-section-head">
                    <span className="report-section-num">{String(i + 1).padStart(2, "0")}</span>
                    <span className="report-section-title">{section.title}</span>
                  </div>
                  <div className="report-section-body">{section.body}</div>
                  {section.citations?.length > 0 && (
                    <div className="report-sources">
                      <span className="report-sources-label">Sources:</span>
                      {formatGroupedCitations(section.citations)}
                    </div>
                  )}
                </div>
              ))
            ) : null}

            {evalEntries.length > 0 && storedTicker === ticker && (
              <div className="panel" style={{ marginTop: 16 }}>
                <div className="panel-head">
                  <span>Evaluation</span>
                </div>
                <div className="eval-grid">
                  {evalEntries.map(([k, v]) => (
                    <div key={k} className="eval-cell">
                      <div className="eval-cell-label">{k.replace(/_/g, " ")}</div>
                      <div className="eval-cell-value">{String(v)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {!loading && showSections.length > 0 && (
            <aside className="sidebar-sticky">
              <div className="panel">
                <div className="panel-head">
                  <span>Contents</span>
                  <span>{showSections.length}</span>
                </div>
                <div className="panel-body" style={{ padding: "10px 18px" }}>
                  {showSections.map((s, i) => (
                    <a key={s.title} href={`#section-${i}`} className="toc-item">
                      <span className="toc-num">{String(i + 1).padStart(2, "0")}</span>
                      {s.title}
                    </a>
                  ))}
                </div>
              </div>
            </aside>
          )}
        </div>
      </main>
    </>
  );
}
