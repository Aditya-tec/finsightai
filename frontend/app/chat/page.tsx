"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import AgentFeed from "@/components/AgentFeed";
import CitationLinks from "@/components/CitationLinks";
import type { CompareData } from "@/lib/compareTypes";
import CompareTable from "@/components/CompareTable";
import DegradedBanner from "@/components/DegradedBanner";
import EvalScores from "@/components/EvalScores";
import FadeSlideIn from "@/components/FadeSlideIn";
import LoadingDots from "@/components/LoadingDots";
import TopBar from "@/components/TopBar";
import FormattedText from "@/components/FormattedText";
import { fetchCompanies } from "@/lib/api";
import type { Citation } from "@/lib/citations";
import { getApiErrorMessage } from "@/lib/apiErrors";
import { companyDisplayName } from "@/lib/companyNames";
import { easeOut } from "@/lib/motion";
import { chatStreamApi } from "@/lib/stream";
import type { StreamStep } from "@/lib/streamTypes";
import { getSessionId } from "@/lib/sessionId";

const STAGGER = 0.09;

function ChatPageContent() {
  const params = useSearchParams();
  const ticker = params.get("ticker") ?? undefined;
  const reduced = useReducedMotion();
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [citations, setCitations] = useState<Citation[]>([]);
  const [evalScores, setEvalScores] = useState<Record<string, unknown>>({});
  const [steps, setSteps] = useState<StreamStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [companies, setCompanies] = useState<Array<{ ticker: string; name: string }>>([]);
  const [compareTickers, setCompareTickers] = useState<string[]>([]);
  const [compareData, setCompareData] = useState<CompareData | null>(null);
  const [rateLimitedUntil, setRateLimitedUntil] = useState(0);
  const [sessionDegraded, setSessionDegraded] = useState(false);
  const sessionId = getSessionId();
  const rateLimitActive = rateLimitedUntil > Date.now();

  useEffect(() => {
    fetchCompanies()
      .then((list) => setCompanies(list))
      .catch(() => setCompanies([]));
  }, []);

  const displayName = ticker ? companyDisplayName(ticker, companies) : null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!query.trim() || rateLimitActive) return;
    setLoading(true);
    setError("");
    setSteps([]);
    setAnswer("");
    setCitations([]);
    setEvalScores({});
    setCompareTickers([]);
    setCompareData(null);

    try {
      await chatStreamApi(
        { query, ticker, session_id: sessionId, conversation_history: [] },
        {
          onStep: (step) => setSteps((s) => [...s, step]),
          onEval: (scores) => {
            setEvalScores(scores);
            if (scores.degraded) setSessionDegraded(true);
          },
          onResult: (res) => {
            setAnswer(res.answer);
            setCitations(res.citations);
            setEvalScores(res.eval_scores);
            if (res.eval_scores?.degraded) setSessionDegraded(true);
            if (res.tickers && res.tickers.length > 1) setCompareTickers(res.tickers);
            setCompareData(res.comparison ?? null);
          },
          onError: (detail) => {
            if (detail.toLowerCase().includes("rate limit")) {
              setRateLimitedUntil(Date.now() + 60_000);
            }
            setError(detail);
          },
        }
      );
    } catch (err) {
      setError(getApiErrorMessage(err, "chat"));
    } finally {
      setLoading(false);
    }
  }

  const confidence = String(evalScores.confidence ?? "high");
  const showGrade = confidence === "high" && !evalScores.degraded;

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
          ) : (
            <Link href="/" className="btn-ghost" style={{ padding: "7px 14px" }}>
              Pick a company
            </Link>
          )
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
                <p>
                  Financial Q&A grounded in BSE/NSE filings with live agent reasoning.
                  {!ticker && " Compare companies by name (e.g. Compare INFY vs TCS revenue)."}
                </p>
              </div>
              {showGrade && evalScores.grade != null && (
                <span className="grade-badge">Grade {String(evalScores.grade)}</span>
              )}
            </div>
          </header>
        </FadeSlideIn>

        {sessionDegraded && (
          <FadeSlideIn delay={0.02}>
            <DegradedBanner />
          </FadeSlideIn>
        )}

        <div className="split-layout">
          <div className="col-stack">
            <FadeSlideIn delay={STAGGER * 0}>
              <form onSubmit={onSubmit}>
                <div className="panel panel-elevated">
                  <div className="panel-head">
                    <span>Your Question</span>
                    {displayName ? <span>{displayName}</span> : <span>Any / Compare</span>}
                  </div>
                  <div className="panel-body">
                    <textarea
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="input-area"
                      placeholder={
                        ticker
                          ? "What was FY25 revenue and operating margin?"
                          : "Compare INFY vs TCS revenue and margins"
                      }
                    />
                    <motion.button
                      type="submit"
                      disabled={loading || rateLimitActive}
                      className={`btn-green btn-glow${loading ? " is-loading" : ""}`}
                      style={{ marginTop: 14 }}
                      whileHover={reduced || loading ? undefined : { scale: 1.02 }}
                      whileTap={reduced || loading ? undefined : { scale: 0.98 }}
                      transition={{ duration: 0.2, ease: easeOut }}
                    >
                      {loading ? <LoadingDots label="Running" /> : rateLimitActive ? "Rate limited — wait" : "Run Query"}
                    </motion.button>
                    {rateLimitActive && (
                      <p className="rate-limit-note">Groq rate limit — retry in about a minute.</p>
                    )}
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
            {compareData && compareTickers.length > 1 && (
              <FadeSlideIn delay={STAGGER * 1.5}>
                <CompareTable tickers={compareTickers} comparison={compareData} companies={companies} />
              </FadeSlideIn>
            )}

            <FadeSlideIn delay={STAGGER * 2}>
              <div className="panel panel-elevated panel-answer">
                <div className="panel-head">
                  <span>{compareData ? "Summary" : "Answer"}</span>
                </div>
                <div className="panel-body">
                  <AnimatePresence mode="wait">
                    {answer ? (
                      <motion.div
                        key="answer"
                        className={`answer-text${compareData ? " answer-text-summary" : ""}`}
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
                    <CitationLinks citations={citations} ticker={ticker} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {Object.keys(evalScores).length > 0 && (
                <motion.div
                  initial={reduced ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.3, ease: easeOut }}
                >
                  <EvalScores scores={evalScores} />
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
