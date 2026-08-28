import type { NextRequest } from "next/server";

type WindowConfig = {
  limit: number;
  windowMs: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

/** Per-instance limits (Vercel serverless). Stops casual abuse; not global across all nodes. */
const RULES: Array<{
  test: (path: string, method: string) => boolean;
  config: WindowConfig;
  name: string;
}> = [
  {
    name: "report",
    test: (path, method) =>
      method === "POST" &&
      (path === "/api/report/stream" || path === "/api/report"),
    config: { limit: 5, windowMs: 60 * 60 * 1000 },
  },
  {
    name: "chat",
    test: (path, method) =>
      method === "POST" && (path === "/api/chat/stream" || path === "/api/chat"),
    config: { limit: 15, windowMs: 60 * 1000 },
  },
  {
    name: "summarize",
    test: (path, method) => method === "POST" && path === "/api/summarize-bullets",
    config: { limit: 20, windowMs: 60 * 1000 },
  },
  {
    name: "documents",
    test: (path) => path.startsWith("/api/documents/"),
    config: { limit: 40, windowMs: 60 * 1000 },
  },
  {
    name: "lenient",
    test: (path) => path === "/api/health" || path === "/api/companies",
    config: { limit: 120, windowMs: 60 * 1000 },
  },
  {
    name: "default",
    test: () => true,
    config: { limit: 80, windowMs: 60 * 1000 },
  },
];

export function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

function pickRule(path: string, method: string) {
  for (const rule of RULES) {
    if (rule.name === "default") continue;
    if (rule.test(path, method)) return rule;
  }
  return RULES[RULES.length - 1];
}

function windowLabel(windowMs: number): string {
  if (windowMs >= 60 * 60 * 1000) return "an hour";
  if (windowMs >= 60 * 1000) return "a minute";
  return `${Math.ceil(windowMs / 1000)} seconds`;
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSec: number; message: string };

export function checkRateLimit(request: NextRequest): RateLimitResult {
  const pathname = request.nextUrl.pathname;
  const method = request.method.toUpperCase();
  const rule = pickRule(pathname, method);
  const ip = clientIp(request);
  const key = `${ip}:${rule.name}`;
  const now = Date.now();
  const { limit, windowMs } = rule.config;

  let entry = buckets.get(key);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 1, resetAt: now + windowMs };
    buckets.set(key, entry);
    return { allowed: true };
  }

  if (entry.count >= limit) {
    const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return {
      allowed: false,
      retryAfterSec,
      message: `Too many requests. Demo limit reached — try again in ${retryAfterSec}s (resets every ${windowLabel(windowMs)}).`,
    };
  }

  entry.count += 1;
  buckets.set(key, entry);
  return { allowed: true };
}

/** Test helper */
export function resetRateLimitsForTests(): void {
  buckets.clear();
}
