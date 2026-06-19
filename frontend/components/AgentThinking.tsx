"use client";

type Props = {
  steps: string[];
  loading?: boolean;
};

export default function AgentThinking({ steps, loading }: Props) {
  return (
    <section className="terminal-card">
      <div className="terminal-header">
        <span className="terminal-title">Agent Runtime</span>
        <span className="terminal-value">{loading ? "Processing" : "Idle"}</span>
      </div>
      <ul className="space-y-2 text-xs font-mono">
        {steps.length === 0 && (
          <li className="text-[var(--text-muted)]">
            {loading ? "[boot] initializing retrieval pipeline..." : "[idle] waiting for query"}
          </li>
        )}
        {steps.map((s, idx) => (
          <li key={`${s}-${idx}`} className="flex gap-2 text-[var(--text-primary)]">
            <span className="text-[var(--accent)]">{">"}</span>
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
