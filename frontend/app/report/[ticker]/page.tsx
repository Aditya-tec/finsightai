"use client";

import { jsPDF } from "jspdf";
import Link from "next/link";
import { FormEvent, use, useEffect, useLayoutEffect, useState } from "react";

import AgentFeed from "@/components/AgentFeed";
import TopBar from "@/components/TopBar";
import { chatApi, reportApi } from "@/lib/api";
import { buildConversationHistoryForApi, useReportStore } from "@/lib/reportStore";
import { openThoughtStream } from "@/lib/stream";

export default function ReportPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = use(params);
  const { sections, followup, ticker: storedTicker, setReport, addFollowup, clear } = useReportStore();
  const showSections = storedTicker === ticker ? sections : [];
  const showFollowup = storedTicker === ticker ? followup : [];
  const [steps, setSteps] = useState<string[]>([]);
  const [evalScores, setEvalScores] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [followQuery, setFollowQuery] = useState("");
  const [followLoading, setFollowLoading] = useState(false);
  const [error, setError] = useState("");

  useLayoutEffect(() => {
    if (storedTicker !== ticker) {
      clear();
      setEvalScores({});
      setFollowQuery("");
      setError("");
    }
  }, [ticker, storedTicker, clear]);

  useEffect(() => {
    const controller = new AbortController();
    let stream: EventSource | null = null;

    async function load() {
      setLoading(true);
      setError("");
      setSteps([]);
      stream = openThoughtStream(`Generate report for ${ticker}`, (msg) =>
        setSteps((s) => [...s, msg])
      );
      try {
        const res = await reportApi({ ticker }, controller.signal);
        setReport(ticker, res.sections);
        setEvalScores(res.eval_scores);
      } catch (err) {
        if (controller.signal.aborted) return;
        const ax = err as { message?: string; response?: { status?: number; data?: { detail?: string } } };
        if (ax.response?.status === 429) {
          setError(ax.response.data?.detail ?? "Groq rate limit reached — wait a few minutes and retry.");
        } else if (ax.response?.data?.detail) {
          setError(String(ax.response.data.detail));
        } else if (ax.message?.toLowerCase().includes("timeout")) {
          setError("Report timed out — try again in a minute.");
        } else {
          setError("Could not reach the backend. Make sure uvicorn is running on port 8000, then refresh and retry.");
        }
      } finally {
        stream?.close();
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    load();
    return () => {
      controller.abort();
      stream?.close();
    };
  }, [ticker, setReport]);

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
    } finally {
      setFollowLoading(false);
    }
  }

  function exportPdf() {
    const doc = new jsPDF();
    let y = 10;
    doc.setFontSize(16);
    doc.text(`FinSight AI Report - ${ticker}`, 10, y);
    y += 8;
    doc.setFontSize(10);
    showSections.forEach((section) => {
      const lines = doc.splitTextToSize(`${section.title}\n${section.body}`, 185);
      if (y + lines.length * 5 > 280) {
        doc.addPage();
        y = 10;
      }
      doc.text(lines, 10, y);
      y += lines.length * 5 + 4;
    });
    doc.save(`finsight-report-${ticker}.pdf`);
  }

  const evalEntries = Object.entries(evalScores).filter(([k]) => k !== "grade");

  return (
    <>
      <TopBar
        action={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
            </div>
            {evalScores.grade != null && storedTicker === ticker && (
              <span className="grade-badge">Grade {String(evalScores.grade)}</span>
            )}
          </div>
        </header>

        <AgentFeed steps={steps} loading={loading} />

        {error && (
          <div className="panel" style={{ marginTop: 16, borderColor: "var(--red, #e55)" }}>
            <div className="panel-body" style={{ color: "var(--red, #e55)" }}>
              {error}
            </div>
          </div>
        )}

        <div className="report-layout" style={{ marginTop: 24 }}>
          <div>
            {loading || showSections.length === 0 ? (
              <div className="panel">
                <div className="panel-body answer-placeholder">Generating report sections...</div>
              </div>
            ) : (
              showSections.map((section, i) => (
                <div key={section.title} className="report-section" id={`section-${i}`}>
                  <div className="report-section-head">
                    <span className="report-section-num">{String(i + 1).padStart(2, "0")}</span>
                    <span className="report-section-title">{section.title}</span>
                  </div>
                  <div className="report-section-body">{section.body}</div>
                  {section.citations?.length > 0 && (
                    <div style={{ borderTop: "1px solid var(--border)" }}>
                      {section.citations.map((c, ci) => (
                        <div key={ci} className="citation-row">
                          <div className="citation-source">{c.source}</div>
                          <div className="citation-meta">
                            {c.section ?? ""}
                            {c.page ? ` · pg ${c.page}` : ""}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}

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

              <div className="panel">
                <div className="panel-head">
                  <span>Follow-up Chat</span>
                </div>
                <div className="panel-body">
                  <form onSubmit={onFollowUp}>
                    <input
                      value={followQuery}
                      onChange={(e) => setFollowQuery(e.target.value)}
                      className="input-line"
                      placeholder="> ask about this report..."
                      style={{ marginBottom: 10 }}
                    />
                    <button disabled={followLoading} className="btn-green" style={{ width: "100%" }}>
                      {followLoading ? "Sending..." : "Send"}
                    </button>
                  </form>
                  {showFollowup.length > 0 && (
                    <div style={{ marginTop: 16, maxHeight: 280, overflowY: "auto" }}>
                      {showFollowup.map((m, i) => (
                        <div key={`${m.role}-${i}`} className={`chat-msg ${m.role}`}>
                          <div className="chat-msg-role">{m.role}</div>
                          {m.content}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </aside>
          )}
        </div>
      </main>
    </>
  );
}
