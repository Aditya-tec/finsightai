"use client";

import { FormEvent, useState } from "react";

import { chatApi } from "@/lib/api";
import { buildConversationHistoryForApi, useReportStore } from "@/lib/reportStore";

export default function ChatInterface() {
  const { ticker, sections, followup, addFollowup } = useReportStore();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    const userQuery = query;
    setQuery("");
    addFollowup({ role: "user", content: userQuery });
    try {
      const response = await chatApi({
        query: userQuery,
        ticker,
        conversation_history: buildConversationHistoryForApi(sections, followup),
      });
      addFollowup({ role: "assistant", content: response.answer, citations: response.citations });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="terminal-card">
      <div className="terminal-header">
        <span className="terminal-title">Follow-up Session</span>
        <span className="terminal-value">{ticker ?? "No Ticker"}</span>
      </div>
      <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Follow-up Chat</h3>
      <div className="mb-3 max-h-60 space-y-2 overflow-auto rounded-lg border border-[var(--border)] bg-[rgba(3,12,8,0.7)] p-3">
        {followup.length === 0 && (
          <p className="text-xs text-[var(--text-muted)]">Ask anything about this report...</p>
        )}
        {followup.map((m, i) => (
          <div
            key={`${m.role}-${i}`}
            className={`rounded-lg px-3 py-2 text-xs ${
              m.role === "user"
                ? "ml-4 border border-[var(--border-strong)] bg-[rgba(7,27,19,0.8)] text-[var(--text-primary)]"
                : "mr-4 border border-[rgba(53,240,138,0.35)] bg-[rgba(53,240,138,0.08)] text-[var(--text-secondary)]"
            }`}
          >
            <span className="mb-1 block text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
              {m.role}
            </span>
            {m.content}
          </div>
        ))}
      </div>
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask anything about this report..."
          className="input flex-1 py-2"
        />
        <button disabled={loading} type="submit" className="btn-primary shrink-0">
          {loading ? "..." : "Send"}
        </button>
      </form>
    </section>
  );
}
