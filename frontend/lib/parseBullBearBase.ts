const CASE_PATTERNS: { key: "bull" | "bear" | "base"; pattern: RegExp }[] = [
  { key: "bull", pattern: /\b(?:the\s+)?bull\s+case\b/i },
  { key: "bear", pattern: /\b(?:the\s+)?bear\s+case\b/i },
  { key: "base", pattern: /\b(?:the\s+)?base\s+case\b/i },
];

export type ScenarioBlocks = {
  intro?: string;
  bull?: string;
  bear?: string;
  base?: string;
};

function findMarkers(text: string): { key: "bull" | "bear" | "base"; index: number; length: number }[] {
  const markers: { key: "bull" | "bear" | "base"; index: number; length: number }[] = [];
  for (const { key, pattern } of CASE_PATTERNS) {
    const match = pattern.exec(text);
    if (match && match.index !== undefined) {
      markers.push({ key, index: match.index, length: match[0].length });
    }
  }
  markers.sort((a, b) => a.index - b.index);
  return markers;
}

function cleanBlock(raw: string): string {
  return raw
    .replace(/^\*+\s*/, "")
    .replace(/\*+$/, "")
    .trim();
}

/**
 * Parse Section 10 prose into bull/bear/base blocks when case keywords are present.
 * Returns null if fewer than 2 cases found — caller falls back to prose-only.
 */
export function parseBullBearBase(body: string): ScenarioBlocks | null {
  const text = body.trim();
  if (text.length < 80) return null;

  const markers = findMarkers(text);
  if (markers.length < 2) return null;

  const result: ScenarioBlocks = {};
  const firstIndex = markers[0].index;
  if (firstIndex > 20) {
    const intro = cleanBlock(text.slice(0, firstIndex));
    if (intro.length > 15) result.intro = intro;
  }

  for (let i = 0; i < markers.length; i++) {
    const { key, index, length } = markers[i];
    const start = index + length;
    const end = i + 1 < markers.length ? markers[i + 1].index : text.length;
    const block = cleanBlock(text.slice(start, end));
    if (block.length > 20) {
      result[key] = block;
    }
  }

  const caseCount = [result.bull, result.bear, result.base].filter(Boolean).length;
  return caseCount >= 2 ? result : null;
}

export function hasScenarioCards(blocks: ScenarioBlocks | null): blocks is ScenarioBlocks {
  if (!blocks) return false;
  return [blocks.bull, blocks.bear, blocks.base].filter(Boolean).length >= 2;
}
