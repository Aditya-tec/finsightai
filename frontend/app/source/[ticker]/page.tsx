"use client";

import Link from "next/link";
import { Suspense, use } from "react";
import { useSearchParams } from "next/navigation";

import TopBar from "@/components/TopBar";
import { documentApiUrl } from "@/lib/api";
import { companyDisplayName } from "@/lib/companyNames";
import { fetchCompanies } from "@/lib/api";
import { useEffect, useState } from "react";

function SourceViewer({ ticker }: { ticker: string }) {
  const params = useSearchParams();
  const page = params.get("page") ?? "1";
  const fiscalYear = params.get("fiscal_year") ?? "FY25";
  const [companies, setCompanies] = useState<Array<{ ticker: string; name: string }>>([]);
  const pdfUrl = `${documentApiUrl(ticker, fiscalYear)}#page=${page}`;

  useEffect(() => {
    fetchCompanies()
      .then(setCompanies)
      .catch(() => setCompanies([]));
  }, []);

  const name = companyDisplayName(ticker, companies);

  return (
    <>
      <TopBar
        action={
          <Link href={`/report/${ticker}`} className="btn-ghost" style={{ padding: "7px 14px" }}>
            Back to report
          </Link>
        }
      />
      <main className="page-wide source-page">
        <Link href={`/report/${ticker}`} className="back-link">
          ← {name} Report
        </Link>
        <header className="page-header">
          <h1>
            {name} · {fiscalYear} Filing
          </h1>
          <p>
            Page {page} · Source PDF from annual report corpus
          </p>
        </header>
        <div className="pdf-viewer-wrap panel panel-elevated">
          <iframe
            title={`${ticker} ${fiscalYear} page ${page}`}
            src={pdfUrl}
            className="pdf-viewer-frame"
          />
        </div>
      </main>
    </>
  );
}

export default function SourcePage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = use(params);
  return (
    <Suspense fallback={<main className="page empty-state">Loading PDF…</main>}>
      <SourceViewer ticker={ticker} />
    </Suspense>
  );
}
