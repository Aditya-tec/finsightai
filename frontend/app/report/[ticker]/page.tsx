"use client";

import Link from "next/link";
import { FormEvent, use, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import ExportPdfMenu from "@/components/ExportPdfMenu";
import FadeSlideIn from "@/components/FadeSlideIn";
import ReportSectionCard from "@/components/ReportSectionCard";
import TopBar from "@/components/TopBar";
import FormattedText from "@/components/FormattedText";
import { chatApi, fetchCompanies, reportApi, summarizeBulletsApi } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/apiErrors";
import { ensureAllBullets, sectionKey } from "@/lib/bulletSummary";
import { exportReportPdf } from "@/lib/exportReportPdf";
import { companyDisplayName } from "@/lib/companyNames";
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

const FIGURES_DISCLAIMER =
  "Figures may reflect standalone or consolidated basis depending on filing context.";

const STAGGER = 0.09;

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
  const [companies, setCompanies] = useState<Array<{ ticker: string; name: string; sector: string }>>([]);
  const [bulletCache, setBulletCache] = useState<Record<string, string[]>>({});
  const [viewMode, setViewMode] = useState<Record<string, "prose" | "bullets">>({});
  const [loadingSection, setLoadingSection] = useState<string | null>(null);
  const [sectionErrors, setSectionErrors] = useState<Record<string, string>>({});
  const [exportLoading, setExportLoading] = useState(false);
  const [exportProgress, setExportProgress] = useState("");
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
      setBulletCache({});
      setViewMode({});
      setLoadingSection(null);
      setSectionErrors({});
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
    setBulletCache({});
    setViewMode({});
    setSectionErrors({});

    try {
      const res = await reportApi({ ticker, force_refresh: forceRefresh }, controller.signal);
      setReport(ticker, res.sections);
      setEvalScores(res.eval_scores);
      setGeneratedAt(res.generated_at ?? null);
    } catch (err) {
      if (controller.signal.aborted) return;
      const ax = err as { response?: { status?: number } };
      if (ax.response?.status === 429 && forceRefresh && hadReport) {
        setError("Rate limit reached — showing last cached version");
      } else {
        setError(getApiErrorMessage(err, "report"));
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
      addFollowup({
        role: "assistant",
        content: getApiErrorMessage(err, "chat"),
      });
    } finally {
      setFollowLoading(false);
    }
  }

  const handleSectionToggle = useCallback(
    async (section: { title: string; body: string }) => {
      const key = sectionKey(section.title);
      const currentMode = viewMode[key] ?? "prose";
      const cached = bulletCache[key];

      if (cached?.length) {
        setViewMode((prev) => ({
          ...prev,
          [key]: currentMode === "bullets" ? "prose" : "bullets",
        }));
        setSectionErrors((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        return;
      }

      setLoadingSection(key);
      setSectionErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });

      try {
        const res = await summarizeBulletsApi({ title: section.title, body: section.body });
        setBulletCache((prev) => ({ ...prev, [key]: res.bullets }));
        setViewMode((prev) => ({ ...prev, [key]: "bullets" }));
      } catch (err) {
        setSectionErrors((prev) => ({
          ...prev,
          [key]: getApiErrorMessage(err, "bullets"),
        }));
      } finally {
        setLoadingSection(null);
      }
    },
    [bulletCache, viewMode]
  );

  function exportPdfFull() {
    const company = companies.find((c) => c.ticker === ticker);
    exportReportPdf({
      ticker,
      companyName: company?.name,
      sector: company?.sector,
      sections: showSections,
      evalScores,
      format: "prose",
    });
  }

  async function exportPdfBullet() {
    const company = companies.find((c) => c.ticker === ticker);
    setExportLoading(true);
    setExportProgress("Generating summary… (0/11)");
    setError("");

    try {
      const cache = await ensureAllBullets(showSections, bulletCache, (done, total) => {
        setExportProgress(`Generating summary… (${done}/${total})`);
      });
      setBulletCache(cache);

      exportReportPdf({
        ticker,
        companyName: company?.name,
        sector: company?.sector,
        sections: showSections.map((s) => ({
          ...s,
          bullets: cache[sectionKey(s.title)],
        })),
        evalScores,
        format: "bullets",
      });
    } catch (err) {
      setError(getApiErrorMessage(err, "export"));
    } finally {
      setExportLoading(false);
      setExportProgress("");
    }
  }

  const evalEntries = Object.entries(evalScores).filter(([k]) => k !== "grade");
  const displayName = companyDisplayName(ticker, companies);

  return (
    <>
      <TopBar
        action={
          <div className="topbar-actions">
            <button
              disabled={loading}
              onClick={onRegenerate}
              className={loading ? "btn-generating" : "btn-ghost"}
              style={{ padding: "7px 14px" }}
              title="Runs live Groq API calls (~60–90s) and may use daily quota"
            >
              {loading ? "Generating..." : "Regenerate"}
            </button>
            <ExportPdfMenu
              disabled={loading || showSections.length === 0}
              loading={exportLoading}
              loadingLabel={exportProgress || "Generating summary…"}
              onExportFull={exportPdfFull}
              onExportBullet={exportPdfBullet}
            />
            <span className="tag tag-ticker">{ticker}</span>
          </div>
        }
      />
      <main className="page-wide">
        <FadeSlideIn delay={0}>
          <Link href="/" className="back-link">
            ← Companies
          </Link>
        </FadeSlideIn>

        <FadeSlideIn delay={STAGGER * 0.5}>
          <header className="page-header">
          <div className="page-header-row">
            <div>
              <h1>{displayName} · Equity Report</h1>
              <p>11-section analyst report with citations, eval scores, and follow-up chat.</p>
              {formattedDate && storedTicker === ticker && (
                <p className="report-meta">
                  Report last updated: {formattedDate}
                  {staleReport ? " (may be outdated)" : ""}
                </p>
              )}
              <p className="figures-disclaimer">{FIGURES_DISCLAIMER}</p>
            </div>
            {evalScores.grade != null && storedTicker === ticker && (
              <span className="grade-badge">Grade {String(evalScores.grade)}</span>
            )}
          </div>
        </header>
        </FadeSlideIn>

        {showSections.length > 0 && storedTicker === ticker && (
          <FadeSlideIn delay={STAGGER}>
          <div className="panel panel-elevated report-followup-wide">
            <div className="report-followup-bar">
              <span className="report-followup-title">Follow-up Chat</span>
              <form onSubmit={onFollowUp} className="report-followup-form">
                <input
                  value={followQuery}
                  onChange={(e) => setFollowQuery(e.target.value)}
                  className="input-line"
                  placeholder="Ask about this report…"
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
                    <div className="chat-msg-role">
                      {m.role === "user" ? "User" : "Assistant"}
                    </div>
                    <FormattedText text={m.content} />
                  </div>
                ))}
              </div>
            )}
          </div>
          </FadeSlideIn>
        )}

        {error && (
          <FadeSlideIn delay={STAGGER}>
          <div className="panel panel-elevated panel-error" style={{ marginTop: 16 }}>
            <div className="panel-body">{error}</div>
          </div>
          </FadeSlideIn>
        )}

        <div className="report-layout" style={{ marginTop: 24 }}>
          <div>
            {loading && showSections.length === 0 ? (
              <FadeSlideIn delay={STAGGER * 2}>
              <div className="panel panel-elevated">
                <div className="panel-body answer-placeholder">Generating report sections...</div>
              </div>
              </FadeSlideIn>
            ) : showSections.length > 0 ? (
              showSections.map((section, i) => {
                const key = sectionKey(section.title);
                return (
                  <FadeSlideIn key={section.title} delay={STAGGER * 2 + i * 0.04}>
                  <ReportSectionCard
                    section={section}
                    index={i}
                    ticker={ticker}
                    viewMode={viewMode[key] ?? "prose"}
                    bullets={bulletCache[key]}
                    loading={loadingSection === key}
                    error={sectionErrors[key]}
                    onToggle={() => handleSectionToggle(section)}
                  />
                  </FadeSlideIn>
                );
              })
            ) : null}

            {evalEntries.length > 0 && storedTicker === ticker && (
              <FadeSlideIn delay={STAGGER * 3}>
              <div className="panel panel-elevated" style={{ marginTop: 16 }}>
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
              </FadeSlideIn>
            )}
          </div>

          {!loading && showSections.length > 0 && (
            <aside className="sidebar-sticky">
              <FadeSlideIn delay={STAGGER * 2.5}>
              <div className="panel panel-elevated toc-panel">
                <div className="panel-head">
                  <span>Contents</span>
                  <span>{showSections.length}</span>
                </div>
                <div className="panel-body">
                  {showSections.map((s, i) => (
                    <a key={s.title} href={`#section-${i}`} className="toc-item">
                      <span className="toc-num">{String(i + 1).padStart(2, "0")}</span>
                      {s.title}
                    </a>
                  ))}
                </div>
              </div>
              </FadeSlideIn>
            </aside>
          )}
        </div>
      </main>
    </>
  );
}
