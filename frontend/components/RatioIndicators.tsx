"use client";

import { motion } from "framer-motion";

import type { ParsedRatio } from "@/lib/parseFinancialRatios";

type Props = {
  ratios: ParsedRatio[];
};

const rowVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.07,
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

export default function RatioIndicators({ ratios }: Props) {
  return (
    <div className="ratio-indicators-wrap" aria-label="Key financial ratios">
      {ratios.map((r, i) => {
        const barWidth = Math.min(100, Math.max(0, r.value));
        return (
          <motion.div
            key={r.id}
            className="ratio-indicator-row"
            custom={i}
            initial="hidden"
            animate="visible"
            variants={rowVariants}
          >
            <span className="ratio-indicator-label">{r.label}</span>
            <div className="ratio-indicator-track" aria-hidden>
              <motion.div
                className="ratio-indicator-fill"
                initial={{ width: 0 }}
                animate={{ width: `${barWidth}%` }}
                transition={{
                  delay: 0.15 + i * 0.08,
                  duration: 0.85,
                  ease: [0.22, 1, 0.36, 1],
                }}
              />
              <motion.div
                className="ratio-indicator-shimmer"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.5, 0] }}
                transition={{
                  delay: 0.4 + i * 0.08,
                  duration: 1.2,
                  ease: "easeOut",
                }}
              />
            </div>
            <motion.span
              className="ratio-indicator-value"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 + i * 0.08, duration: 0.3 }}
            >
              {r.display}
            </motion.span>
          </motion.div>
        );
      })}
    </div>
  );
}
