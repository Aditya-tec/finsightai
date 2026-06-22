"use client";

import { motion } from "framer-motion";

import type { KeyMetrics } from "@/lib/parseKeyMetrics";

type Props = {
  metrics: KeyMetrics;
};

const cardVariants = {
  hidden: { opacity: 0, y: 14, scale: 0.94 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.07,
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

export default function KeyMetricsStrip({ metrics }: Props) {
  return (
    <div className="key-metrics-strip" aria-label="Key metrics">
      {metrics.items.map((m, i) => (
        <motion.div
          key={m.id}
          className="key-metric-card"
          custom={i}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
            whileHover={{ y: -3, scale: 1.02, transition: { duration: 0.2 } }}
        >
          <span className="key-metric-glow" aria-hidden />
          <span className="key-metric-value">{m.display}</span>
          <span className="key-metric-label">{m.label}</span>
        </motion.div>
      ))}
    </div>
  );
}
