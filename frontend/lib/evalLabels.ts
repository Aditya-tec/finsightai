export const EVAL_LABELS: Record<string, string> = {
  faithfulness_score: "Faithfulness",
  unsupported_sentences: "Unsupported Claims",
  hallucination_detected: "Hallucinations",
  hallucination_flags: "Flagged Numbers",
  citation_accuracy: "Citation Accuracy",
  answer_relevance: "Relevance",
  sources_used: "Sources Used",
  total_claims: "Total Claims",
  verified_claims: "Verified Claims",
  eval_method: "Eval Method",
  grade: "Grade",
  confidence: "Confidence",
  degraded: "Degraded Mode",
};

export function formatEvalValue(key: string, value: unknown): string {
  if (value == null) return "—";
  if (key === "faithfulness_score" || key === "citation_accuracy" || key === "answer_relevance") {
    const n = Number(value);
    return Number.isFinite(n) ? `${Math.round(n * 100)}%` : String(value);
  }
  if (key === "hallucination_detected" || key === "degraded") {
    return value ? "Yes" : "No";
  }
  if (key === "eval_method") {
    const s = String(value);
    if (s === "lexical_heuristic") return "Lexical heuristic";
    if (s === "conversational") return "Conversational";
    return s.replace(/_/g, " ");
  }
  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : "None";
  }
  return String(value);
}
