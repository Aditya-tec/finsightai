import { API_BASE } from "./api";

export type { Citation } from "./api";

export function fiscalYearFor(
  citations: Array<{ fiscal_year?: string }>,
  fallback = "FY25"
): string {
  for (const c of citations) {
    if (c.fiscal_year) return c.fiscal_year;
  }
  return fallback;
}

export function annualReportCitationLabel(ticker?: string, fiscalYear = "FY25"): string {
  const report = `${fiscalYear} Annual Report`;
  const symbol = ticker?.trim().toUpperCase();
  return symbol ? `${symbol} ${report}` : report;
}

export function sourcePageHref(ticker: string, page: number, fiscalYear = "FY25"): string {
  return `/source/${ticker.toUpperCase()}?page=${page}&fiscal_year=${encodeURIComponent(fiscalYear)}`;
}

/** Plain string for PDF export */
export function formatGroupedCitations(
  citations: Array<{ page?: number; ticker?: string; fiscal_year?: string }>,
  ticker?: string
): string {
  if (citations.length === 0) return "";
  const fy = fiscalYearFor(citations);
  const sym = citations[0]?.ticker?.toUpperCase() ?? ticker?.toUpperCase();
  const pages: number[] = [];
  const seen = new Set<number>();
  for (const c of citations) {
    if (c.page != null && !seen.has(c.page)) {
      seen.add(c.page);
      pages.push(c.page);
    }
  }
  const label = annualReportCitationLabel(sym, fy);
  if (pages.length === 0) return label;
  return `${label}, pg ${pages.join(", ")}`;
}
