type Props = {
  scores: Record<string, unknown>;
};

const LABELS: Record<string, string> = {
  faithfulness_score: "Faithfulness",
  hallucination_detected: "Hallucinations",
  hallucination_flags: "Flags",
  citation_accuracy: "Citation Accuracy",
  answer_relevance: "Relevance",
  sources_used: "Sources Used",
  total_claims: "Total Claims",
  verified_claims: "Verified Claims",
  grade: "Grade",
};

export default function EvalScores({ scores }: Props) {
  const entries = Object.entries(scores || {});
  const grade = String(scores?.grade ?? "—");

  return (
    <section className="terminal-card">
      <div className="terminal-header">
        <span className="terminal-title">Evaluation</span>
        <span className="terminal-value">Quality Gate</span>
      </div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Evaluation Scores</h3>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-bold ${
            grade === "A"
              ? "border-[var(--accent)] bg-[rgba(53,240,138,0.14)] text-[var(--accent)]"
              : "border-amber-500/40 bg-amber-500/15 text-amber-200"
          }`}
        >
          Grade {grade}
        </span>
      </div>
      {entries.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]">Scores appear after generation.</p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {entries
            .filter(([k]) => k !== "grade")
            .map(([k, v]) => (
              <div
                key={k}
                className="rounded-lg border border-[var(--border)] bg-[rgba(4,16,11,0.75)] px-3 py-2"
              >
                <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                  {LABELS[k] ?? k}
                </div>
                <div className="mt-0.5 text-sm font-medium text-[var(--text-primary)]">
                  {String(v)}
                </div>
              </div>
            ))}
        </div>
      )}
    </section>
  );
}
