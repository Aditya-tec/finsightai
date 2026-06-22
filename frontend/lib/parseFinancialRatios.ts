export type ParsedRatio = {
  id: string;
  label: string;
  value: number;
  display: string;
};

const RATIO_SPECS: { id: string; label: string; patterns: RegExp[] }[] = [
  {
    id: "roe",
    label: "Return on Equity",
    patterns: [
      /return\s+on\s+(?:net\s+worth|equity)\s+(?:\(ROE\)\s+)?(?:at|of|stood\s+at|was|is)\s+(\d+(?:\.\d+)?)\s*%/i,
      /(?:ROE|return\s+on\s+equity)\s+(?:at|of|stood\s+at|was|is)\s+(\d+(?:\.\d+)?)\s*%/i,
      /(\d+(?:\.\d+)?)\s*%\s+return\s+on\s+(?:net\s+worth|equity)/i,
    ],
  },
  {
    id: "operating_margin",
    label: "Operating Margin",
    patterns: [
      /(\d+(?:\.\d+)?)\s*%\s+operating\s+margin/i,
      /operating\s+margin\s+(?:at|of|stood\s+at|was|is)\s+(\d+(?:\.\d+)?)\s*%/i,
      /maintained\s+(?:an\s+)?(?:a\s+)?(\d+(?:\.\d+)?)\s*%\s+operating\s+margin/i,
    ],
  },
  {
    id: "revenue_growth",
    label: "Revenue Growth",
    patterns: [
      /(\d+(?:\.\d+)?)\s*%\s+revenue\s+growth/i,
      /revenue\s+growth\s+(?:at|of|stood\s+at|was|is)\s+(\d+(?:\.\d+)?)\s*%/i,
    ],
  },
  {
    id: "fcf_growth",
    label: "Free Cash Flow Growth",
    patterns: [
      /(\d+(?:\.\d+)?)\s*%\s+free\s+cash\s+flow\s+growth/i,
      /free\s+cash\s+flow\s+growth\s+(?:at|of|stood\s+at|was|is)\s+(\d+(?:\.\d+)?)\s*%/i,
    ],
  },
  {
    id: "dividend_growth",
    label: "Dividend Growth",
    patterns: [
      /(\d+(?:\.\d+)?)\s*%\s+dividend\s+(?:per\s+share\s+)?growth/i,
      /dividend\s+(?:per\s+share\s+)?growth\s+(?:at|of|stood\s+at|was|is)\s+(\d+(?:\.\d+)?)\s*%/i,
    ],
  },
  {
    id: "eps_growth",
    label: "EPS Growth",
    patterns: [
      /(\d+(?:\.\d+)?)\s*%\s+(?:basic\s+)?(?:and\s+diluted\s+)?EPS\s+growth/i,
      /EPS\s+growth\s+(?:at|of|stood\s+at|was|is)\s+(\d+(?:\.\d+)?)\s*%/i,
    ],
  },
  {
    id: "roa",
    label: "Return on Assets",
    patterns: [
      /return\s+on\s+assets\s+(?:\(ROA\)\s+)?(?:at|of|stood\s+at|was|is)\s+(\d+(?:\.\d+)?)\s*%/i,
      /(?:ROA|return\s+on\s+assets)\s+(?:at|of|stood\s+at|was|is)\s+(\d+(?:\.\d+)?)\s*%/i,
    ],
  },
];

function parsePct(raw: string): number | null {
  const n = parseFloat(raw.replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  return n;
}

/** Parse percentage ratios from section prose. Returns null if none found. */
export function parseFinancialRatios(text: string): ParsedRatio[] | null {
  const corpus = text.trim();
  if (!corpus) return null;

  const seen = new Set<string>();
  const items: ParsedRatio[] = [];

  for (const spec of RATIO_SPECS) {
    for (const pattern of spec.patterns) {
      const match = pattern.exec(corpus);
      if (!match?.[1] || seen.has(spec.id)) continue;
      const value = parsePct(match[1]);
      if (value === null) continue;
      seen.add(spec.id);
      items.push({
        id: spec.id,
        label: spec.label,
        value,
        display: `${value}%`,
      });
      break;
    }
    if (items.length >= 6) break;
  }

  return items.length > 0 ? items : null;
}
