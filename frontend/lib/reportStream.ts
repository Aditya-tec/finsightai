import { API_BASE } from "./api";
import type { ReportStreamSection } from "./streamTypes";

type ReportStreamHandlers = {
  onSection: (index: number, section: ReportStreamSection, total: number) => void;
  onProgress?: (index: number, total: number) => void;
  onComplete?: (generatedAt: string | null, evalScores: Record<string, unknown>) => void;
  onError: (detail: string) => void;
};

export async function reportStreamApi(
  payload: { ticker: string; force_refresh?: boolean },
  handlers: ReportStreamHandlers,
  signal?: AbortSignal
): Promise<void> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const apiKey = process.env.NEXT_PUBLIC_API_KEY;
  if (apiKey) headers["X-API-Key"] = apiKey;

  const res = await fetch(`${API_BASE}/api/report/stream`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      ticker: payload.ticker,
      force_refresh: payload.force_refresh ?? false,
    }),
    signal,
  });

  if (!res.ok || !res.body) {
    handlers.onError(`Report stream failed (${res.status})`);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let evalScores: Record<string, unknown> = {};
  let generatedAt: string | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const event = JSON.parse(line.slice(6)) as Record<string, unknown>;
        if (event.type === "section") {
          const index = Number(event.index);
          const total = Number(event.total);
          handlers.onProgress?.(index + 1, total);
          handlers.onSection(
            index,
            event.section as ReportStreamSection,
            total
          );
          if (event.generated_at) generatedAt = String(event.generated_at);
        } else if (event.type === "complete") {
          generatedAt = event.generated_at ? String(event.generated_at) : generatedAt;
        } else if (event.type === "result") {
          evalScores = (event.eval_scores as Record<string, unknown>) ?? {};
          if (event.generated_at) generatedAt = String(event.generated_at);
        } else if (event.type === "error") {
          if (event.report) {
            const report = event.report as {
              sections: ReportStreamSection[];
              eval_scores: Record<string, unknown>;
              generated_at?: string;
            };
            report.sections.forEach((s, i) => handlers.onSection(i, s, report.sections.length));
            evalScores = report.eval_scores ?? {};
            generatedAt = report.generated_at ?? null;
            handlers.onComplete?.(generatedAt, { ...evalScores, degraded: true });
            return;
          }
          handlers.onError(String(event.detail ?? "Unknown error"));
          return;
        }
      } catch {
        /* skip */
      }
    }
  }
  handlers.onComplete?.(generatedAt, evalScores);
}
