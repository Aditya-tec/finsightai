import { API_BASE } from "./api";
import type { ChatStreamResult, StreamStep } from "./streamTypes";

export type { ChatStreamResult, StreamStep };

type StreamHandlers = {
  onStep: (step: StreamStep) => void;
  onEval?: (scores: Record<string, unknown>) => void;
  onResult: (result: ChatStreamResult) => void;
  onError: (detail: string) => void;
  onDone?: () => void;
};

export async function chatStreamApi(
  payload: {
    query: string;
    ticker?: string;
    tickers?: string[];
    conversation_history?: Array<{ role: string; content: string; citations?: unknown[] }>;
  },
  handlers: StreamHandlers,
  signal?: AbortSignal
): Promise<void> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const apiKey = process.env.NEXT_PUBLIC_API_KEY;
  if (apiKey) headers["X-API-Key"] = apiKey;

  const res = await fetch(`${API_BASE}/api/chat/stream`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal,
  });

  if (!res.ok || !res.body) {
    handlers.onError(`Chat stream failed (${res.status})`);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

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
        if (event.type === "step") {
          handlers.onStep({
            message: String(event.message ?? ""),
            phase: event.phase ? String(event.phase) : undefined,
          });
        } else if (event.type === "eval") {
          handlers.onEval?.((event.eval_scores as Record<string, unknown>) ?? {});
        } else if (event.type === "result") {
          handlers.onResult({
            answer: String(event.answer ?? ""),
            citations: (event.citations as ChatStreamResult["citations"]) ?? [],
            eval_scores: (event.eval_scores as Record<string, unknown>) ?? {},
            sources: (event.sources as string[]) ?? [],
            tickers: event.tickers as string[] | undefined,
          });
        } else if (event.type === "error") {
          handlers.onError(String(event.detail ?? "Unknown error"));
        } else if (event.type === "done") {
          const nested = event.result as ChatStreamResult | undefined;
          if (nested?.answer) handlers.onResult(nested);
          handlers.onDone?.();
        }
      } catch {
        /* skip malformed */
      }
    }
  }
  handlers.onDone?.();
}

/** @deprecated Use chatStreamApi */
export function openThoughtStream(
  _query: string,
  onMessage: (msg: string) => void,
  onDone?: () => void
) {
  onMessage("Use chatStreamApi for live agent events.");
  onDone?.();
  return { close: () => undefined };
}
