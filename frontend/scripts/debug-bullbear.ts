import fs from "node:fs";
import path from "node:path";

import { parseBullBearBase } from "../lib/parseBullBearBase";

const CASE_PATTERNS: { key: string; pattern: RegExp }[] = [
  { key: "bull", pattern: /\b(?:on\s+the\s+|the\s+)bull\s+case\b/gi },
  { key: "bear", pattern: /\b(?:on\s+the\s+|the\s+)bear\s+case\b/gi },
  { key: "base", pattern: /\b(?:on\s+the\s+|the\s+|our\s+)base\s+case\b/gi },
];

const NEXT_CASE_BOUNDARY =
  /\s+(?:On the other hand|In contrast|However|Meanwhile|Furthermore),?\s*(?:\n\n)?\s*(?=(?:the|our)\s+(?:bull|bear|base)\s+case\b)/i;

function blockStart(text: string, markerIndex: number): number {
  if (markerIndex === 0) return 0;
  const before = text.slice(0, markerIndex);
  const paraBreak = before.lastIndexOf("\n\n");
  if (paraBreak >= 0 && markerIndex - (paraBreak + 2) <= 80) {
    return paraBreak + 2;
  }
  return markerIndex;
}

function blockEnd(text: string, nextMarkerIndex: number): number {
  const segment = text.slice(0, nextMarkerIndex);
  const boundary = segment.search(NEXT_CASE_BOUNDARY);
  if (boundary >= 0) return boundary;
  return nextMarkerIndex;
}

const tickers = ["ICICIBANK", "WIPRO", "SBIN"];
const cacheDir = path.join(import.meta.dirname, "../../backend/data/report_cache/v7-charts");

for (const ticker of tickers) {
  const data = JSON.parse(
    fs.readFileSync(path.join(cacheDir, `${ticker}.json`), "utf-8")
  ) as { sections: Array<{ title: string; body: string }> };
  const body = data.sections.find((s) => s.title === "Bull vs Bear vs Base Case")!.body;
  const blocks = parseBullBearBase(body);
  console.log(`\n=== ${ticker} ===`, blocks ? "OK" : "NULL");

  const markers: { key: string; index: number }[] = [];
  for (const { key, pattern } of CASE_PATTERNS) {
    const re = new RegExp(pattern.source, "gi");
    let earliest: number | null = null;
    let m: RegExpExecArray | null;
    while ((m = re.exec(body)) !== null) {
      if (earliest === null || m.index < earliest) earliest = m.index;
    }
    if (earliest !== null) markers.push({ key, index: earliest });
  }
  markers.sort((a, b) => a.index - b.index);

  for (let i = 0; i < markers.length; i++) {
    const { key, index } = markers[i];
    const start = blockStart(body, index);
    const rawEnd = i + 1 < markers.length ? markers[i + 1].index : body.length;
    const end = blockEnd(body, rawEnd);
    const raw = body.slice(start, end);
    console.log(
      `  ${key}: marker@${index} start@${start} end@${end} rawLen=${raw.length} rawStart="${raw.slice(0, 50)}"`
    );
  }

  if (blocks) {
    for (const k of ["bull", "bear", "base"] as const) {
      console.log(`  parsed ${k}: len=${blocks[k]?.length ?? 0}`);
    }
  }
}
