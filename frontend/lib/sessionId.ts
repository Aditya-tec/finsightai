"use client";

const STORAGE_KEY = "rupeeread_session_id";

export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

export function resetSessionId(): string {
  const id = crypto.randomUUID();
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
