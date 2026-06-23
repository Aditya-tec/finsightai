"use client";

import Link from "next/link";
import { Suspense, use, useCallback, useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";

import PdfPageViewer from "@/components/PdfPageViewer";
import TopBar from "@/components/TopBar";
import {
  DocumentPage,
  fetchCompanies,
  fetchDocumentPage,
  fetchDocumentPdfBlob,
} from "@/lib/api";
import { companyDisplayName } from "@/lib/companyNames";
import { sourcePageHref } from "@/lib/citations";

function highlightText(text: string, hint?: string): ReactNode {
  if (!hint?.trim() || !text) return text;
  const words = hint
    .split(/\s+/)
    .map((w) => w.replace(/[^\w]/g, ""))
    .filter((w) => w.length > 4)
    .slice(0, 3);
  if (words.length === 0) return text;
  const pattern = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  const parts = text.split(pattern);
  const lowerWords = new Set(words.map((w) => w.toLowerCase()));
  return parts.map((part, i) =>
    lowerWords.has(part.toLowerCase()) ? (
      <mark key={i} className="source-highlight">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function SourceViewer({ ticker }: { ticker: string }) {
  const params = useSearchParams();
  const pageParam = params.get("page") ?? "1";
  const pageNum = Math.max(1, parseInt(pageParam, 10) || 1);
  const fiscalYear = params.get("fiscal_year") ?? "FY25";
  const sectionHint = params.get("section") ?? undefined;

  const [companies, setCompanies] = useState<Array<{ ticker: string; name: string }>>([]);
  const [pageData, setPageData] = useState<DocumentPage | null>(null);
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"pdf" | "text">("text");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sym = ticker.toUpperCase();
  const name = companyDisplayName(ticker, companies);

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDocumentPage(sym, fiscalYear, pageNum, sectionHint);
      setPageData(data);
      setViewMode(data.pdf_available ? "pdf" : "text");
    } catch (err: unknown) {
      setPageData(null);
      const detail =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : null;
      setError(typeof detail === "string" ? detail : "Could not load this source page.");
    } finally {
      setLoading(false);
    }
  }, [sym, fiscalYear, pageNum, sectionHint]);

  useEffect(() => {
    fetchCompanies()
      .then(setCompanies)
      .catch(() => setCompanies([]));
  }, []);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  useEffect(() => {
    if (!pageData?.pdf_available || viewMode !== "pdf") {
      setPdfObjectUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    fetchDocumentPdfBlob(sym, fiscalYear)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPdfObjectUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) {
          setViewMode("text");
          setError("PDF could not be loaded — showing extracted text instead.");
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [sym, fiscalYear, pageData?.pdf_available, viewMode]);

  const pageCount = pageData?.page_count ?? 0;
  const displayPage = pageData?.page ?? pageNum;
  const prevPage = displayPage > 1 ? displayPage - 1 : null;
  const nextPage = pageCount > 0 && displayPage < pageCount ? displayPage + 1 : null;

  return (
    <>
      <TopBar
        action={
          <Link href={`/report/${sym}`} className="btn-ghost" style={{ padding: "7px 14px" }}>
            Back to report
          </Link>
        }
      />
      <main className="page-wide source-page">
        <Link href={`/report/${sym}`} className="back-link">
          ← {name} Report
        </Link>
        <header className="page-header">
          <h1>
            {name} · {fiscalYear} Filing
          </h1>
          <p>
            Page {displayPage}
            {pageData?.page_mismatch ? ` (requested ${pageData.requested_page})` : ""}
            {sectionHint ? ` · ${sectionHint}` : ""}
          </p>
        </header>

        {pageCount > 0 && (
          <nav className="source-page-nav" aria-label="Page navigation">
            {prevPage ? (
              <Link href={sourcePageHref(sym, prevPage, fiscalYear)} className="btn-ghost source-nav-btn">
                ← Page {prevPage}
              </Link>
            ) : (
              <span className="source-nav-spacer" />
            )}
            <span className="source-nav-label">
              Page {displayPage} of {pageCount}
            </span>
            {nextPage ? (
              <Link href={sourcePageHref(sym, nextPage, fiscalYear)} className="btn-ghost source-nav-btn">
                Page {nextPage} →
              </Link>
            ) : (
              <span className="source-nav-spacer" />
            )}
          </nav>
        )}

        {pageData?.pdf_available && pageData.parsed_available && (
          <div className="source-view-toggle">
            <button
              type="button"
              className={viewMode === "pdf" ? "btn-primary source-toggle-btn" : "btn-ghost source-toggle-btn"}
              onClick={() => setViewMode("pdf")}
            >
              PDF
            </button>
            <button
              type="button"
              className={viewMode === "text" ? "btn-primary source-toggle-btn" : "btn-ghost source-toggle-btn"}
              onClick={() => setViewMode("text")}
            >
              Extracted text
            </button>
          </div>
        )}

        {loading && (
          <div className="panel panel-elevated empty-state">Loading source page…</div>
        )}

        {!loading && error && !pageData && (
          <div className="panel panel-elevated empty-state error-state">{error}</div>
        )}

        {!loading && pageData && viewMode === "pdf" && pdfObjectUrl && (
          <PdfPageViewer pdfUrl={pdfObjectUrl} pageNumber={displayPage} />
        )}

        {!loading && pageData && (viewMode === "text" || !pdfObjectUrl) && (
          <div className="source-text-panel panel panel-elevated">
            {pageData.page_mismatch && (
              <p className="source-mismatch-note">
                Exact page {pageData.requested_page} was not found in the parsed filing — showing
                nearest page {pageData.page}.
              </p>
            )}
            {pageData.text ? (
              <pre className="source-text-body">{highlightText(pageData.text, sectionHint)}</pre>
            ) : (
              <p className="empty-state">
                No extracted text for this page.{" "}
                {pageData.pdf_available ? "Switch to PDF view if available." : "Add the PDF to data/raw/."}
              </p>
            )}
          </div>
        )}

        {!loading && error && pageData && (
          <p className="source-inline-error">{error}</p>
        )}
      </main>
    </>
  );
}

export default function SourcePage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = use(params);
  return (
    <Suspense fallback={<main className="page empty-state">Loading source…</main>}>
      <SourceViewer ticker={ticker} />
    </Suspense>
  );
}
