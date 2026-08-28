import type { Citation } from "./api";
import type { CompareData } from "./compareTypes";

export type StreamStep = {
  message: string;
  phase?: string;
};

export type ChatStreamResult = {
  answer: string;
  citations: Citation[];
  eval_scores: Record<string, unknown>;
  sources: string[];
  tickers?: string[];
  comparison?: CompareData | null;
};

export type ReportStreamSection = {
  title: string;
  body: string;
  citations: Citation[];
  chart_data?: unknown;
};
