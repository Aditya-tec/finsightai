import type { Citation } from "./api";

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
};

export type ReportStreamSection = {
  title: string;
  body: string;
  citations: Citation[];
  chart_data?: unknown;
};
