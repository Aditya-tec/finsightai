"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { feedLineEnter } from "@/lib/motion";

type Props = {
  steps: string[];
  loading?: boolean;
};

function statusLabel(loading: boolean | undefined, stepCount: number): string {
  if (loading) return "Running";
  if (stepCount > 0) return "Done";
  return "Idle";
}

function statusDotClass(loading: boolean | undefined, stepCount: number): string {
  if (loading) return "active";
  if (stepCount > 0) return "done";
  return "idle";
}

export default function AgentFeed({ steps, loading }: Props) {
  const reduced = useReducedMotion();
  const dotClass = statusDotClass(loading, steps.length);

  return (
    <div className="panel panel-elevated">
      <div className="panel-head">
        <span>Agent pipeline</span>
        <span className="pipeline-status">
          <span className={`pipeline-status-dot ${dotClass}`} />
          {statusLabel(loading, steps.length)}
        </span>
      </div>
      <div className="panel-body">
        {steps.length === 0 ? (
          <p className="answer-placeholder">
            {loading ? "Booting retrieval pipeline…" : "Waiting for query"}
          </p>
        ) : (
          <AnimatePresence initial={false}>
            {steps.map((s, i) => (
              <motion.div
                key={`${i}-${s}`}
                className={`feed-line ${i === steps.length - 1 && loading ? "active" : ""}`}
                variants={feedLineEnter}
                initial={reduced ? false : "hidden"}
                animate="visible"
              >
                {s}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
