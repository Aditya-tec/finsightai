export type CompareMetric = {
  label: string;
  values: Record<string, string>;
  note?: string;
};

export type CompareData = {
  summary: string;
  metrics: CompareMetric[];
  takeaways?: string[];
};

export function isCompareData(value: unknown): value is CompareData {
  if (!value || typeof value !== "object") return false;
  const row = value as CompareData;
  return typeof row.summary === "string" && Array.isArray(row.metrics) && row.metrics.length > 0;
}
