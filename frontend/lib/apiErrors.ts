import axios from "axios";

export type ApiErrorContext =
  | "companies"
  | "report"
  | "chat"
  | "bullets"
  | "export"
  | "generic";

const GROQ_RATE_LIMIT_MSG =
  "Groq rate limit reached. Wait a few minutes and retry.";

export function isProxyRateLimitMessage(detail: string | undefined): boolean {
  if (!detail) return false;
  return /demo limit/i.test(detail) || /too many requests/i.test(detail);
}

const CONTEXT_FALLBACK: Record<ApiErrorContext, string> = {
  companies: "Could not load companies. Check that the backend is running.",
  report: "Could not load the report. Try again in a moment.",
  chat: "Could not get a response. Try again in a moment.",
  bullets: "Could not generate bullet summary.",
  export: "Bullet summary export failed.",
  generic: "Something went wrong. Please try again.",
};

function isAbortError(err: unknown): boolean {
  if (axios.isCancel(err)) return true;
  const ax = err as { code?: string; name?: string; message?: string };
  return (
    ax.code === "ERR_CANCELED" ||
    ax.name === "CanceledError" ||
    ax.name === "AbortError" ||
    Boolean(ax.message?.toLowerCase().includes("aborted"))
  );
}

function isTimeoutError(err: unknown): boolean {
  const ax = err as { code?: string; message?: string };
  return ax.code === "ECONNABORTED" || Boolean(ax.message?.toLowerCase().includes("timeout"));
}

function isNetworkError(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false;
  return !err.response && Boolean(err.request);
}

export function getApiErrorMessage(err: unknown, context: ApiErrorContext = "generic"): string {
  if (isAbortError(err)) {
    if (context === "report") return "Report request cancelled.";
    return "Request cancelled.";
  }

  if (isTimeoutError(err)) {
    if (context === "report") return "Report timed out — try again in a minute.";
    if (context === "chat") return "Query timed out — try again in a minute.";
    if (context === "bullets") return "Bullet summary timed out — try again.";
    return "Request timed out — try again.";
  }

  if (isNetworkError(err)) {
    return "Can't reach the server. Check your connection and try again.";
  }

  if (axios.isAxiosError(err) && err.response) {
    const status = err.response.status;
    const detail = (err.response.data as { detail?: string })?.detail;

    if (status === 429) {
      if (typeof detail === "string" && detail) return detail;
      return GROQ_RATE_LIMIT_MSG;
    }
    if (status === 401) {
      return "Unauthorized — app misconfigured. Check API key settings.";
    }
    if (status === 503) {
      return typeof detail === "string" && detail
        ? detail
        : "Search index unavailable — try again later.";
    }
    if (status >= 500) {
      return "Server error — try again in a moment.";
    }
    if (typeof detail === "string" && detail) {
      return detail;
    }
  }

  return CONTEXT_FALLBACK[context];
}
