"use client";

import Link from "next/link";

import { Citation, fiscalYearFor, formatGroupedCitations, sourcePageHref } from "@/lib/citations";

type Props = {
  citations: Citation[];
  ticker?: string;
};

export default function CitationLinks({ citations, ticker }: Props) {
  if (citations.length === 0) return null;

  const fy = fiscalYearFor(citations);
  const sym = citations[0]?.ticker?.toUpperCase() ?? ticker?.toUpperCase();
  const label = sym ? `${sym} ${fy} Annual Report` : `${fy} Annual Report`;

  const pageLinks: Array<{ page: number; section?: string }> = [];
  const seen = new Set<number>();
  for (const c of citations) {
    if (c.page != null && !seen.has(c.page)) {
      seen.add(c.page);
      pageLinks.push({ page: c.page, section: c.section });
    }
  }

  if (!sym || pageLinks.length === 0) {
    return <span className="report-sources-text">{formatGroupedCitations(citations, ticker)}</span>;
  }

  return (
    <span className="report-sources-text">
      {label}, pg{" "}
      {pageLinks.map(({ page, section }, i) => (
        <span key={page}>
          {i > 0 ? ", " : ""}
          <Link href={sourcePageHref(sym, page, fy, section)} className="citation-page-link">
            {page}
          </Link>
        </span>
      ))}
    </span>
  );
}
