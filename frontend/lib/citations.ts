export type Citation = { source: string; page?: number; section?: string };

/** FY label for annual report citations; make dynamic when multi-year corpus is added. */
export const REPORT_FY_LABEL = "FY25";

export function annualReportCitationLabel(ticker?: string): string {
  const report = `${REPORT_FY_LABEL} Annual Report`;
  const symbol = ticker?.trim().toUpperCase();
  return symbol ? `${symbol} ${report}` : report;
}

/** e.g. "SUNPHARMA FY25 Annual Report, pg 213, 172, 210" */
export function formatGroupedCitations(citations: Citation[], ticker?: string): string {
  if (citations.length === 0) return "";

  const pages: number[] = [];
  const seen = new Set<number>();
  for (const c of citations) {
    if (c.page != null && !seen.has(c.page)) {
      seen.add(c.page);
      pages.push(c.page);
    }
  }

  const label = annualReportCitationLabel(ticker);
  if (pages.length === 0) return label;
  return `${label}, pg ${pages.join(", ")}`;
}
