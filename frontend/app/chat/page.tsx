"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import AgentFeed from "@/components/AgentFeed";
import TopBar from "@/components/TopBar";
import FormattedText from "@/components/FormattedText";
import { chatApi, fetchCompanies } from "@/lib/api";
import { companyDisplayName } from "@/lib/companyNames";
import { formatGroupedCitations } from "@/lib/citations";
import { openThoughtStream } from "@/lib/stream";

function ChatPageContent() {
  const params = useSearchParams();
  const ticker = params.get("ticker") ?? undefined;
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [citations, setCitations] = useState<
    Array<{ source: string; page?: number; section?: string }>
  >([]);
  const [evalScores, setEvalScores] = useState<Record<string, unknown>>({});
  const [steps, setSteps] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [companies, setCompanies] = useState<Array<{ ticker: string; name: string }>>([]);

  useEffect(() => {
    fetchCompanies()
      .then((list) => setCompanies(list))
      .catch(() => setCompanies([]));
  }, []);

  const displayName = ticker ? companyDisplayName(ticker, companies) : null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setSteps([]);
    setAnswer("");
    const stream = openThoughtStream(query, (msg) => setSteps((s) => [...s, msg]));
    try {
      const res = await chatApi({ query, ticker, conversation_history: [] });
      setAnswer(res.answer);
      setCitations(res.citations);
      setEvalScores(res.eval_scores);
    } catch (err) {
      const ax = err as { message?: string; response?: { status?: number; data?: { detail?: string } } };
      if (ax.response?.status === 429) {
        setError(ax.response.data?.detail ?? "Groq rate limit reached — wait a few minutes and retry.");
      } else if (ax.response?.data?.detail) {
        setError(String(ax.response.data.detail));
      } else {
        setError("Could not reach the backend. Stop all uvicorn processes, restart one on port 8000, then retry.");
      }
    } finally {
      stream.close();
      setLoading(false);
    }
  }

  const evalEntries = Object.entries(evalScores).filter(([k]) => k !== "grade");

  return (
    <>
      <TopBar
        action={
          ticker ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Link href={`/report/${ticker}`} className="btn-accent" style={{ padding: "7px 16px" }}>
                Generate Report
              </Link>
              <span className="tag tag-ticker">{ticker}</span>
            </div>
          ) : undefined
        }
      />
      <main className="page-wide">
        <Link href="/" className="back-link">
          ← Companies
        </Link>

        <header className="page-header">
          <div className="page-header-row">
            <div>
              <h1>{displayName ? `Chat · ${displayName}` : "Ask a Question"}</h1>
              <p>Financial Q&A grounded in BSE/NSE filings with live agent reasoning.</p>
            </div>
            {evalScores.grade != null && (
              <span className="grade-badge">Grade {String(evalScores.grade)}</span>
            )}
          </div>
        </header>

        <div className="split-layout">
          <div className="col-stack">
            <form onSubmit={onSubmit}>
              <div className="panel">
                <div className="panel-head">
                  <span>Your Question</span>
                  {displayName ? <span>{displayName}</span> : <span>—</span>}
                </div>
                <div className="panel-body">
                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="input-area"
                    placeholder="What was FY25 revenue and operating margin?"
                  />
                  <button disabled={loading} className="btn-green" style={{ marginTop: 14 }}>
                    {loading ? "Running..." : "Run Query"}
                  </button>
                </div>
              </div>
            </form>
            <AgentFeed steps={steps} loading={loading} />
            {error && (
              <div className="panel" style={{ borderColor: "var(--red, #e55)" }}>
                <div className="panel-body" style={{ color: "var(--red, #e55)" }}>{error}</div>
              </div>
            )}
          </div>

          <div className="col-stack">
            <div className="panel">
              <div className="panel-head">
                <span>Answer</span>
              </div>
              <div className="panel-body">
                {answer ? (
                  <p className="answer-text">
                    <FormattedText text={answer} />
                  </p>
                ) : (
                  <p className="answer-placeholder">
                    {loading ? "Generating answer..." : "Your answer will appear here."}
                  </p>
                )}
              </div>
            </div>

            {citations.length > 0 && (
              <div className="panel">
                <div className="panel-head">
                  <span>Citations</span>
                  <span>{citations.length}</span>
                </div>
                <div className="panel-body report-sources">
                  <span className="report-sources-label">Sources:</span>
                  {formatGroupedCitations(citations, ticker)}
                </div>
              </div>
            )}

            {evalEntries.length > 0 && (
              <div className="panel">
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
        </div>
      </main>
    </>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<main className="page empty-state">Loading...</main>}>
      <ChatPageContent />
    </Suspense>
  );
}
