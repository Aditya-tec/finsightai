"use client";

import Link from "next/link";

import { Citation, fiscalYearFor, formatGroupedCitations, sourcePageHref } from "@/lib/citations";

type Props = {
  citations: Citation[];
  ticker?: string;
};

function isLinkablePage(c: Citation): boolean {
  return c.page != null && c.page_valid !== false;
}

export default function CitationLinks({ citations, ticker }: Props) {
  if (citations.length === 0) return null;

  const fy = fiscalYearFor(citations);
  const sym = citations[0]?.ticker?.toUpperCase() ?? ticker?.toUpperCase();
  const label = sym ? `${sym} ${fy} Annual Report` : `${fy} Annual Report`;

  const pageLinks: Array<{ page: number; section?: string; page_mismatch?: boolean }> = [];
  const seen = new Set<number>();
  for (const c of citations) {
    if (isLinkablePage(c) && c.page != null && !seen.has(c.page)) {
      seen.add(c.page);
      pageLinks.push({ page: c.page, section: c.section, page_mismatch: c.page_mismatch });
    }
  }

  if (!sym || pageLinks.length === 0) {
    return <span className="report-sources-text">{formatGroupedCitations(citations, ticker)}</span>;
  }

  return (
    <span className="report-sources-text">
      {label}, pg{" "}
      {pageLinks.map(({ page, section, page_mismatch }, i) => (
        <span key={page}>
          {i > 0 ? ", " : ""}
          <Link
            href={sourcePageHref(sym, page, fy, section)}
            className="citation-page-link"
            title={page_mismatch ? "Nearest parsed page — may differ from citation" : undefined}
          >
            {page}
            {page_mismatch ? "*" : ""}
          </Link>
        </span>
      ))}
    </span>
  );
}
