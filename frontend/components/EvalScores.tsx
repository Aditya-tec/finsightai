"use client";

import { EVAL_LABELS, formatEvalValue } from "@/lib/evalLabels";

type Props = {
  scores: Record<string, unknown>;
};

const HIDDEN_KEYS = new Set(["grade", "confidence", "degraded"]);

export default function EvalScores({ scores }: Props) {
  const grade = String(scores?.grade ?? "—");
  const confidence = String(scores?.confidence ?? "high");
  const degraded = Boolean(scores?.degraded);
  const showGrade = confidence === "high" && !degraded;

  const entries = Object.entries(scores || {}).filter(
    ([k, v]) => !HIDDEN_KEYS.has(k) && v != null && v !== ""
  );

  const gradeClass =
    grade === "A"
      ? "grade-badge grade-a"
      : grade === "B"
        ? "grade-badge grade-b"
        : "grade-badge grade-c";

  return (
    <div className="panel panel-elevated">
      <div className="panel-head">
        <span>Evaluation</span>
        {showGrade ? (
          <span className={gradeClass}>Grade {grade}</span>
        ) : (
          <span className="grade-badge grade-unverified" title="Lexical heuristic only">
            Unverified
          </span>
        )}
      </div>
      {degraded && (
        <div className="degraded-banner panel-body">
          Live search unavailable — answering from cached report context.
        </div>
      )}
      <div className="panel-body">
        {entries.length === 0 ? (
          <p className="answer-placeholder">Scores appear after generation.</p>
        ) : (
          <div className="eval-grid">
            {entries.map(([k, v]) => (
              <div key={k} className="eval-cell">
                <div className="eval-cell-label">{EVAL_LABELS[k] ?? k.replace(/_/g, " ")}</div>
                <div className="eval-cell-value">{formatEvalValue(k, v)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
