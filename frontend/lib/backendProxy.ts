import "server-only";

/** Hugging Face / Railway backend origin (server-only on Vercel). */
export function getBackendUrl(): string {
  const url =
    process.env.BACKEND_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    "http://localhost:8000";
  return url.replace(/\/$/, "");
}

export function getBackendApiKey(): string {
  return (process.env.API_KEY ?? process.env.NEXT_PUBLIC_API_KEY ?? "").trim();
}

export function backendApiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getBackendUrl()}${normalized}`;
}
