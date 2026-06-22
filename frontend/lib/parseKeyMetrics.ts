export type KeyMetric = {
  id: string;
  label: string;
  display: string;
};

export type KeyMetrics = {
  items: KeyMetric[];
};

const METRIC_PATTERNS: {
  id: string;
  label: string;
  patterns: RegExp[];
  format: (value: number) => string;
}[] = [
  {
    id: "revenue_growth",
    label: "Revenue Growth",
    patterns: [
      /(\d+(?:\.\d+)?)\s*%\s+revenue\s+growth/i,
      /revenue\s+growth\s+of\s+(\d+(?:\.\d+)?)\s*%/i,
      /revenue\s+growth\s+(?:at|stood\s+at|was)\s+(\d+(?:\.\d+)?)\s*%/i,
      /(\d+(?:\.\d+)?)\s*%\s+growth\s+in\s+revenue/i,
    ],
    format: (v) => `${v}%`,
  },
  {
    id: "operating_margin",
    label: "Operating Margin",
    patterns: [
      /(\d+(?:\.\d+)?)\s*%\s+operating\s+margin/i,
      /operating\s+margin\s+of\s+(\d+(?:\.\d+)?)\s*%/i,
      /operating\s+margin\s+(?:at|stood\s+at|was|is)\s+(\d+(?:\.\d+)?)\s*%/i,
      /maintained\s+(?:an\s+)?(?:a\s+)?(\d+(?:\.\d+)?)\s*%\s+operating\s+margin/i,
    ],
    format: (v) => `${v}%`,
  },
  {
    id: "roe",
    label: "Return on Equity",
    patterns: [
      /return\s+on\s+(?:net\s+worth|equity)\s+(?:at|of|stood\s+at|was|is)\s+(\d+(?:\.\d+)?)\s*%/i,
      /(?:ROE|return\s+on\s+equity)\s+(?:at|of|stood\s+at|was|is)\s+(\d+(?:\.\d+)?)\s*%/i,
      /(\d+(?:\.\d+)?)\s*%\s+return\s+on\s+(?:net\s+worth|equity)/i,
    ],
    format: (v) => `${v}%`,
  },
  {
    id: "net_profit",
    label: "Net Profit",
    patterns: [
      /net\s+profit\s+(?:increased\s+)?(?:from\s+₹[\d,]+(?:\.\d+)?\s*(?:crore|cr|billion|bn)\s+to\s+)?₹([\d,]+(?:\.\d+)?)\s*(?:crore|cr)/i,
      /consolidated\s+net\s+profit\s+(?:of\s+)?₹([\d,]+(?:\.\d+)?)\s*(?:crore|cr)/i,
      /net\s+profit\s+(?:of|stood\s+at|was)\s+₹([\d,]+(?:\.\d+)?)\s*(?:crore|cr)/i,
    ],
    format: (v) => `₹${v.toLocaleString("en-IN")} Cr`,
  },
];

function parseNumber(raw: string): number | null {
  const n = parseFloat(raw.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function extractMetric(text: string, spec: (typeof METRIC_PATTERNS)[number]): KeyMetric | null {
  for (const pattern of spec.patterns) {
    const match = pattern.exec(text);
    if (!match?.[1]) continue;
    const value = parseNumber(match[1]);
    if (value === null) continue;
    return {
      id: spec.id,
      label: spec.label,
      display: spec.format(value),
    };
  }
  return null;
}

/** Parse headline metrics from executive summary prose or bullet lines. Returns null if fewer than 2 found. */
export function parseKeyMetrics(text: string, bullets?: string[]): KeyMetrics | null {
  const corpus = bullets?.length
    ? bullets.join("\n")
    : text;
  if (!corpus.trim()) return null;

  const seen = new Set<string>();
  const items: KeyMetric[] = [];

  for (const spec of METRIC_PATTERNS) {
    const metric = extractMetric(corpus, spec);
    if (!metric || seen.has(metric.id)) continue;
    seen.add(metric.id);
    items.push(metric);
  }

  return items.length >= 2 ? { items: items.slice(0, 4) } : null;
}
