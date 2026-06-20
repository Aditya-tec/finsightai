"use client";

type Props = {
  steps: string[];
  loading?: boolean;
};

export default function AgentFeed({ steps, loading }: Props) {
  return (
    <div className="panel">
      <div className="panel-head">
        <span>Agent pipeline</span>
        <span>{loading ? "Running" : steps.length ? "Done" : "Idle"}</span>
      </div>
      <div className="panel-body">
        {steps.length === 0 ? (
          <p className="answer-placeholder">
            {loading ? "Booting retrieval pipeline…" : "Waiting for query"}
          </p>
        ) : (
          steps.map((s, i) => (
            <div
              key={`${s}-${i}`}
              className={`feed-line ${i === steps.length - 1 && loading ? "active" : ""}`}
            >
              {s}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
