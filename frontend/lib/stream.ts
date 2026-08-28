import { apiUrl, getClientApiHeaders } from "./apiConfig";
import type { CompareData } from "./compareTypes";
import { isCompareData } from "./compareTypes";
import type { ChatStreamResult, StreamStep } from "./streamTypes";

export type { ChatStreamResult, StreamStep };

type StreamHandlers = {
  onStep: (step: StreamStep) => void;
  onEval?: (scores: Record<string, unknown>) => void;
  onResult: (result: ChatStreamResult) => void;
  onError: (detail: string) => void;
  onDone?: () => void;
};

function parseStreamResult(event: Record<string, unknown>): ChatStreamResult {
  const comparison = isCompareData(event.comparison) ? event.comparison : null;
  return {
    answer: String(event.answer ?? ""),
    citations: (event.citations as ChatStreamResult["citations"]) ?? [],
    eval_scores: (event.eval_scores as Record<string, unknown>) ?? {},
    sources: (event.sources as string[]) ?? [],
    tickers: event.tickers as string[] | undefined,
    comparison,
  };
}

export async function chatStreamApi(
  payload: {
    query: string;
    ticker?: string;
    tickers?: string[];
    session_id?: string;
    conversation_history?: Array<{ role: string; content: string; citations?: unknown[] }>;
  },
  handlers: StreamHandlers,
  signal?: AbortSignal
): Promise<void> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...getClientApiHeaders(),
  };

  const res = await fetch(apiUrl("/api/chat/stream"), {
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
          handlers.onResult(parseStreamResult(event));
        } else if (event.type === "error") {
          handlers.onError(String(event.detail ?? "Unknown error"));
        } else if (event.type === "done") {
          const nested = event.result as Record<string, unknown> | undefined;
          if (nested && typeof nested.answer === "string") handlers.onResult(parseStreamResult(nested));
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
