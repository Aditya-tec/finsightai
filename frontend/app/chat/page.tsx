"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import AgentFeed from "@/components/AgentFeed";
import FadeSlideIn from "@/components/FadeSlideIn";
import LoadingDots from "@/components/LoadingDots";
import TopBar from "@/components/TopBar";
import FormattedText from "@/components/FormattedText";
import { chatApi, fetchCompanies } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/apiErrors";
import { companyDisplayName } from "@/lib/companyNames";
import { formatGroupedCitations } from "@/lib/citations";
import { easeOut } from "@/lib/motion";
import { openThoughtStream } from "@/lib/stream";

const STAGGER = 0.09;

function ChatPageContent() {
  const params = useSearchParams();
  const ticker = params.get("ticker") ?? undefined;
  const reduced = useReducedMotion();
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
      setError(getApiErrorMessage(err, "chat"));
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
            <div className="topbar-actions">
              <Link href={`/report/${ticker}`} className="btn-accent" style={{ padding: "7px 16px" }}>
                Generate Report
              </Link>
              <span className="tag tag-ticker">{ticker}</span>
            </div>
          ) : undefined
        }
      />
      <main className="page-wide">
        <FadeSlideIn delay={0}>
          <Link href="/" className="back-link">
            ← Companies
          </Link>
        </FadeSlideIn>

        <FadeSlideIn delay={0.04}>
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
        </FadeSlideIn>

        <div className="split-layout">
          <div className="col-stack">
            <FadeSlideIn delay={STAGGER * 0}>
              <form onSubmit={onSubmit}>
                <div className="panel panel-elevated">
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
                    <motion.button
                      type="submit"
                      disabled={loading}
                      className={`btn-green btn-glow${loading ? " is-loading" : ""}`}
                      style={{ marginTop: 14 }}
                      whileHover={reduced || loading ? undefined : { scale: 1.02 }}
                      whileTap={reduced || loading ? undefined : { scale: 0.98 }}
                      transition={{ duration: 0.2, ease: easeOut }}
                    >
                      {loading ? <LoadingDots label="Running" /> : "Run Query"}
                    </motion.button>
                  </div>
                </div>
              </form>
            </FadeSlideIn>

            <FadeSlideIn delay={STAGGER * 1}>
              <AgentFeed steps={steps} loading={loading} />
            </FadeSlideIn>

            <AnimatePresence>
              {error && (
                <motion.div
                  className="panel panel-elevated panel-error"
                  initial={reduced ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.25, ease: easeOut }}
                >
                  <div className="panel-body">{error}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="col-stack">
            <FadeSlideIn delay={STAGGER * 2}>
              <div className="panel panel-elevated panel-answer">
                <div className="panel-head">
                  <span>Answer</span>
                </div>
                <div className="panel-body">
                  <AnimatePresence mode="wait">
                    {answer ? (
                      <motion.div
                        key="answer"
                        className="answer-text"
                        initial={reduced ? false : { opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, ease: easeOut }}
                      >
                        <FormattedText text={answer} />
                      </motion.div>
                    ) : (
                      <motion.p
                        key="placeholder"
                        className="answer-placeholder"
                        initial={false}
                        animate={{ opacity: 1 }}
                      >
                        {loading ? "Generating answer…" : "Your answer will appear here."}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </FadeSlideIn>

            <AnimatePresence>
              {citations.length > 0 && (
                <motion.div
                  className="panel panel-elevated"
                  initial={reduced ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.3, ease: easeOut }}
                >
                  <div className="panel-head">
                    <span>Citations</span>
                    <span>{citations.length}</span>
                  </div>
                  <div className="panel-body report-sources">
                    <span className="report-sources-label">Sources:</span>
                    {formatGroupedCitations(citations, ticker)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {evalEntries.length > 0 && (
                <motion.div
                  className="panel panel-elevated"
                  initial={reduced ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.3, ease: easeOut }}
                >
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
                </motion.div>
              )}
            </AnimatePresence>
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
