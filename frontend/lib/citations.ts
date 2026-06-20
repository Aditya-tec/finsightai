export type Citation = { source: string; page?: number; section?: string };

/** Compact grouped citation line, e.g. "filing pg 168, 263 · annual_report pg 45" */
export function formatGroupedCitations(citations: Citation[]): string {
  if (citations.length === 0) return "";

  const bySource = new Map<string, number[]>();
  for (const c of citations) {
    const source = (c.source || "unknown").trim();
    if (!bySource.has(source)) bySource.set(source, []);
    if (c.page != null) bySource.get(source)!.push(c.page);
  }

  return [...bySource.entries()]
    .map(([source, pages]) => {
      if (pages.length === 0) return source;
      const pageList = pages.join(", ");
      return `${source} pg ${pageList}`;
    })
    .join(" · ");
}
