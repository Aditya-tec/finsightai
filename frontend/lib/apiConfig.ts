/**
 * Client-side API routing.
 * - Direct mode: NEXT_PUBLIC_API_URL set → browser calls backend directly (local dev).
 * - Proxy mode: unset → browser calls same-origin /api/* (Vercel adds API key server-side).
 */

export function usesApiProxy(): boolean {
  return !process.env.NEXT_PUBLIC_API_URL?.trim();
}

export function getClientApiBase(): string {
  const direct = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (direct) return direct.replace(/\/$/, "");
  return "";
}

/** Prefix for backend routes: "" + "/api/foo" or "http://localhost:8000" + "/api/foo" */
export function apiUrl(path: string): string {
  const base = getClientApiBase();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

export function getClientApiHeaders(): Record<string, string> {
  if (usesApiProxy()) return {};
  const key = process.env.NEXT_PUBLIC_API_KEY?.trim();
  return key ? { "X-API-Key": key } : {};
}

export function getHealthUrl(): string {
  if (usesApiProxy()) return "/api/health";
  return `${getClientApiBase()}/health`;
}
