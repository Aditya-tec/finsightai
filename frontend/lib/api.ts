import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type ChatMessage = {
  role: string;
  content: string;
  citations?: Array<{ source: string; page?: number; section?: string }>;
};

export type ChatResponse = {
  answer: string;
  citations: Array<{ source: string; page?: number; section?: string }>;
  eval_scores: Record<string, string | number | boolean | string[]>;
  sources: string[];
};

export type ReportResponse = {
  sections: Array<{
    title: string;
    body: string;
    citations: Array<{ source: string; page?: number; section?: string }>;
  }>;
  citations: Array<{ source: string; page?: number; section?: string }>;
  eval_scores: Record<string, string | number | boolean | string[]>;
  sources: string[];
  generated_at?: string | null;
};

export async function fetchCompanies() {
  const res = await axios.get(`${API_BASE}/api/companies`);
  return res.data as Array<{ ticker: string; name: string; sector: string }>;
}

export async function chatApi(payload: {
  query: string;
  ticker?: string;
  conversation_history?: ChatMessage[];
}) {
  const res = await axios.post(`${API_BASE}/api/chat`, payload, { timeout: 120_000 });
  return res.data as ChatResponse;
}

export async function reportApi(
  payload: { ticker: string; force_refresh?: boolean },
  signal?: AbortSignal
) {
  const res = await axios.post(
    `${API_BASE}/api/report`,
    { ticker: payload.ticker, force_refresh: payload.force_refresh ?? false },
    {
      timeout: 600_000,
      signal,
    }
  );
  return res.data as ReportResponse;
}

export type SummarizeBulletsResponse = {
  bullets: string[];
};

export async function summarizeBulletsApi(payload: {
  title: string;
  body: string;
}) {
  const res = await axios.post(`${API_BASE}/api/summarize-bullets`, payload, {
    timeout: 30_000,
  });
  return res.data as SummarizeBulletsResponse;
}

export function streamUrl(query: string) {
  return `${API_BASE}/api/stream?query=${encodeURIComponent(query)}`;
}
