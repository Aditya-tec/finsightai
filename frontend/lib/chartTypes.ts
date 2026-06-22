export type BarDataset = {
  label: string;
  values: [number, number];
};

export type BarChartData = {
  type: "bar";
  labels: [string, string];
  datasets: BarDataset[];
};

export type DonutSegment = {
  label: string;
  value: number;
};

export type DonutChartData = {
  type: "donut";
  segments: DonutSegment[];
};

export type ChartData = BarChartData | DonutChartData;

export const CHART_DISCLAIMER =
  "Chart values extracted from filing text — verify against source document before use.";

export const SECTION_EXECUTIVE = "Executive Summary + Investment Thesis";
export const SECTION_BUSINESS = "Business Overview + Segment Breakdown";
export const SECTION_FINANCIAL = "Financial Performance";
export const SECTION_RATIOS = "Key Financial Ratios";
export const SECTION_BULL_BEAR = "Bull vs Bear vs Base Case";

export function isBarChartData(data: unknown): data is BarChartData {
  if (!data || typeof data !== "object") return false;
  const d = data as BarChartData;
  if (d.type !== "bar" || !Array.isArray(d.labels) || d.labels.length !== 2) return false;
  if (!Array.isArray(d.datasets) || d.datasets.length < 1) return false;
  return d.datasets.every(
    (ds) =>
      typeof ds.label === "string" &&
      Array.isArray(ds.values) &&
      ds.values.length === 2 &&
      ds.values.every((v) => typeof v === "number" && Number.isFinite(v) && v > 0)
  );
}

export function isDonutChartData(data: unknown): data is DonutChartData {
  if (!data || typeof data !== "object") return false;
  const d = data as DonutChartData;
  if (d.type !== "donut" || !Array.isArray(d.segments) || d.segments.length < 2) return false;
  return d.segments.every(
    (s) =>
      typeof s.label === "string" &&
      typeof s.value === "number" &&
      Number.isFinite(s.value) &&
      s.value > 0
  );
}

export function parseChartData(data: unknown): ChartData | null {
  if (isBarChartData(data)) return data;
  if (isDonutChartData(data)) return data;
  return null;
}

/** Blue accent palette for charts — monochrome, no rainbow. */
export const CHART_COLORS = ["#0099ff", "#0066b3", "#4db8ff", "#003d66", "#66c2ff", "#007acc"];

const THOUSAND_CRORE = 1_000;

export type CroreAxisUnit = "plain" | "k";

/** Pick one abbreviation for an entire axis — plain ₹X,XXX Cr or ₹X.Xk Cr only (never L). */
export function pickCroreAxisUnit(maxValue: number): CroreAxisUnit {
  if (!Number.isFinite(maxValue) || maxValue <= 0) return "plain";
  if (maxValue >= THOUSAND_CRORE) return "k";
  return "plain";
}

export function formatCroreAxisTick(valueCr: number, unit: CroreAxisUnit): string {
  if (unit === "k") return `₹${(valueCr / THOUSAND_CRORE).toFixed(1)}k Cr`;
  return `₹${valueCr.toLocaleString("en-IN")} Cr`;
}

export function formatCroreFull(valueCr: number): string {
  return `₹${valueCr.toLocaleString("en-IN")} Cr`;
}

export function maxBarDatasetValue(values: [number, number]): number {
  return Math.max(values[0], values[1]);
}

export function stripSeriesLabel(raw: string): string {
  return raw.replace(/\s*\([^)]*Cr[^)]*\)\s*$/i, "").trim();
}

/** Tooltip line for bar series, e.g. "Revenue (FY25): ₹1,62,990 Cr". */
export function formatBarSeriesTooltip(
  rawLabel: string,
  valueCr: number,
  fiscalYear?: string
): string {
  const name = stripSeriesLabel(rawLabel) || rawLabel;
  const fy = fiscalYear?.trim();
  const prefix = fy ? `${name} (${fy})` : name;
  return `${prefix}: ${formatCroreFull(valueCr)}`;
}

/** Abbreviated single-value label (donut legend when space is tight). */
export function formatChartValue(n: number): string {
  return formatCroreAxisTick(n, pickCroreAxisUnit(n));
}
