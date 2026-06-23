const CASE_PATTERNS: { key: "bull" | "bear" | "base"; pattern: RegExp }[] = [
  { key: "bull", pattern: /\b(?:on\s+the\s+|the\s+)bull\s+case\b/gi },
  { key: "bear", pattern: /\b(?:on\s+the\s+|the\s+)bear\s+case\b/gi },
  { key: "base", pattern: /\b(?:on\s+the\s+|the\s+|our\s+)base\s+case\b/gi },
];

/** Phrase that typically introduces the next scenario block. */
const NEXT_CASE_BOUNDARY =
  /\s+(?:On the other hand|In contrast|However|Meanwhile|Furthermore),?\s*(?:\n\n)?\s*(?=(?:on\s+the\s+)?(?:the|our)\s+(?:bull|bear|base)\s+case\b)/i;

export type ScenarioBlocks = {
  intro?: string;
  bull?: string;
  bear?: string;
  base?: string;
};

function findMarkers(text: string): { key: "bull" | "bear" | "base"; index: number; length: number }[] {
  const markers: { key: "bull" | "bear" | "base"; index: number; length: number }[] = [];

  for (const { key, pattern } of CASE_PATTERNS) {
    const re = new RegExp(pattern.source, "gi");
    let earliest: { index: number; length: number } | null = null;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      if (match.index === undefined) continue;
      if (!earliest || match.index < earliest.index) {
        earliest = { index: match.index, length: match[0].length };
      }
    }
    if (earliest) {
      markers.push({ key, ...earliest });
    }
  }

  markers.sort((a, b) => a.index - b.index);
  return markers;
}

function ensureSentenceStart(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function cleanBlock(raw: string): string {
  return raw
    .replace(/^\*+\s*/, "")
    .replace(/\*+$/, "")
    .replace(/^[,;:]\s*/, "")
    .trim();
}

export function isUnavailableScenarioText(body: string): boolean {
  const lower = body.slice(0, 600).toLowerCase();
  return (
    /unable to provide/.test(lower) ||
    /cannot provide/.test(lower) ||
    /not possible to (?:outline|provide|determine)/.test(lower) ||
    /insufficient (?:data|information|context)/.test(lower) ||
    /does not contain (?:sufficient|enough|explicit)/.test(lower) ||
    /no (?:explicit|clear|specific) (?:bull|bear|base)/.test(lower)
  );
}

export function isBoilerplateIntro(text: string): boolean {
  const head = text.slice(0, 220).toLowerCase();
  return (
    /bull\s+vs\s+bear\s+vs\s+base\s+case/.test(head) ||
    /section of our report/.test(head) ||
    /presents three possible scenarios/.test(head) ||
    /outlines the potential scenarios/.test(head) ||
    /scenario for\s+[\w\s.&'()-]+\s+is shaped by/.test(head)
  );
}

/** Start at paragraph break when marker opens a paragraph; else at marker (same para as prior case). */
function blockStart(text: string, markerIndex: number): number {
  const before = text.slice(0, markerIndex);
  const paraBreak = before.lastIndexOf("\n\n");
  if (paraBreak >= 0 && markerIndex - (paraBreak + 2) <= 80) {
    return paraBreak + 2;
  }
  return markerIndex;
}

/** Cut before connector phrase that leads into the next case (search only after this marker). */
function blockEnd(text: string, markerIndex: number, nextMarkerIndex: number): number {
  const segment = text.slice(markerIndex, nextMarkerIndex);
  const boundary = segment.search(NEXT_CASE_BOUNDARY);
  if (boundary >= 0) return markerIndex + boundary;
  return nextMarkerIndex;
}

function trimBlockTail(block: string): string {
  return block
    .replace(/\s+(?:On the other hand|In contrast|However|Meanwhile|Furthermore),?\s*$/i, "")
    .replace(/\s+supporting\s+a\s+(?:bull|bear|base)\s+case\.?\s*$/i, "")
    .replace(/\s+,\s*$/, "")
    .trim();
}

function stripCaseLeadIn(block: string, key: "bull" | "bear" | "base"): string {
  let b = cleanBlock(block);

  b = b.replace(/^(?:on\s+the\s+other\s+hand|in\s+contrast),?\s+/i, "");

  const openers: Record<typeof key, RegExp[]> = {
    bull: [
      /^on\s+the\s+bull\s+case,?\s+/i,
      /^the\s+bull\s+case\s+for\s+[\w\s.&'()-]+?\s+is\s+supported\s+by\s+/i,
      /^the\s+bull\s+case\s+is\s+supported\s+by\s+/i,
      /^the\s+bull\s+case\s+for\s+[\w\s.&'()-]+?\s+/i,
      /^the\s+bull\s+case\s+(?:is\s+)?(?:supported\s+by\s+)?/i,
    ],
    bear: [
      /^on\s+the\s+bear\s+case,?\s+/i,
      /^the\s+bear\s+case,?\s*(?:on\s+the\s+other\s+hand,?\s*)+/i,
      /^the\s+bear\s+case,?\s*(?:on\s+the\s+other\s+hand,?\s*)?(?:for\s+[\w\s.&'()-]+?\s+)?(?:is\s+)?(?:centered\s+around\s+|driven\s+by\s+)/i,
    ],
    base: [
      /^on\s+the\s+base\s+case,?\s+/i,
      /^our\s+base\s+case(?:\s+scenario)?\s*(?:would\s+likely\s+)?(?:assumes\s+(?:a\s+)?|assumes\s+that\s+)?/i,
      /^the\s+base\s+case(?:\s+scenario)?\s+for\s+[\w\s.&'()-]+?\s+is\s+(?:likely\s+)?(?:characterized\s+by\s+)?/i,
      /^the\s+base\s+case(?:\s+scenario)?\s+for\s+[\w\s.&'()-]+?\s+assumes\s+that\s+/i,
      /^the\s+base\s+case(?:\s+scenario)?\s*(?:assumes\s+that\s+|assumes\s+)?/i,
      /^that\s+/i,
    ],
  };

  for (const re of openers[key]) {
    if (key === "bull") {
      const companyLead = b.match(
        /^the\s+bull\s+case\s+for\s+([\w\s.&'()-]+?)\s+is\s+supported\s+by\s+/i
      );
      if (companyLead) {
        b = cleanBlock(`${companyLead[1]} is supported by ${b.slice(companyLead[0].length)}`);
        break;
      }
    }

    const next = b.replace(re, "").trim();
    if (next !== b) {
      b = cleanBlock(next);
      break;
    }
  }

  return ensureSentenceStart(trimBlockTail(b));
}

/**
 * Parse Section 10 prose into bull/bear/base blocks when case keywords are present.
 * Returns null if fewer than 2 cases found — caller falls back to prose-only.
 */
export function parseBullBearBase(body: string): ScenarioBlocks | null {
  const text = body.trim();
  if (text.length < 80) return null;
  if (isUnavailableScenarioText(text)) return null;

  const markers = findMarkers(text);
  if (markers.length < 2) return null;

  const result: ScenarioBlocks = {};
  const firstStart = blockStart(text, markers[0].index);
  if (firstStart > 20) {
    const intro = cleanBlock(text.slice(0, firstStart));
    if (intro.length > 15 && !isBoilerplateIntro(intro)) {
      result.intro = intro;
    }
  }

  for (let i = 0; i < markers.length; i++) {
    const { key, index } = markers[i];
    const start = blockStart(text, index);
    const rawEnd = i + 1 < markers.length ? markers[i + 1].index : text.length;
    const end = blockEnd(text, index, rawEnd);
    const block = stripCaseLeadIn(text.slice(start, end), key);
    if (block.length > 30) {
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
