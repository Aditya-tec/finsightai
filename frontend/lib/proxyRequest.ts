import "server-only";

import { NextRequest, NextResponse } from "next/server";

import { backendApiUrl, getBackendApiKey } from "./backendProxy";
import { checkRateLimit } from "./rateLimit";

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

function forwardableRequestHeaders(request: NextRequest): Headers {
  const headers = new Headers();
  for (const [key, value] of request.headers.entries()) {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower)) continue;
    if (lower === "x-api-key") continue;
    headers.set(key, value);
  }
  const apiKey = getBackendApiKey();
  if (apiKey) headers.set("X-API-Key", apiKey);
  return headers;
}

function forwardableResponseHeaders(upstream: Response): Headers {
  const headers = new Headers();
  upstream.headers.forEach((value, key) => {
    if (HOP_BY_HOP.has(key.toLowerCase())) return;
    headers.set(key, value);
  });
  return headers;
}

export async function proxyToBackend(
  request: NextRequest,
  backendPath: string
): Promise<NextResponse> {
  const rateLimit = checkRateLimit(request);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { detail: rateLimit.message },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSec) },
      }
    );
  }

  const target = new URL(backendApiUrl(backendPath));
  request.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });

  const headers = forwardableRequestHeaders(request);
  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers,
    signal: request.signal,
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    init.duplex = "half";
  }

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), init);
  } catch {
    return NextResponse.json(
      { detail: "Backend unreachable. Try again in a moment." },
      { status: 502 }
    );
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: forwardableResponseHeaders(upstream),
  });
}
