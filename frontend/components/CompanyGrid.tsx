"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FileText, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";

export type Company = { ticker: string; name: string; sector: string };

type Props = {
  companies: Company[];
  selected: Company | null;
  onSelect: (company: Company | null) => void;
};

const easeOut = [0, 0, 0.2, 1] as const;
const easeInOut = [0.4, 0, 0.2, 1] as const;

const layoutTransition = {
  layout: { duration: 0.22, ease: easeInOut },
  opacity: { duration: 0.16, ease: easeOut },
};

const actionsEnter = { duration: 0.2, ease: easeOut };
const actionsExit = { duration: 0.14, ease: easeOut };

export default function CompanyGrid({ companies, selected, onSelect }: Props) {
  const gridRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const collapse = useCallback(() => onSelect(null), [onSelect]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selected) collapse();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, collapse]);

  useEffect(() => {
    if (!selected) return;
    const onPointerDown = (e: PointerEvent) => {
      if (gridRef.current?.contains(e.target as Node)) return;
      collapse();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [selected, collapse]);

  return (
    <motion.div layoutRoot className="company-grid" ref={gridRef}>
      {companies.map((c, index) => {
        const isSelected = selected?.ticker === c.ticker;
        const isDimmed = selected != null && !isSelected;

        return (
          <motion.div
            key={c.ticker}
            layout
            role="button"
            tabIndex={0}
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: isDimmed ? 0.45 : 1, y: 0 }}
            transition={{
              layout: layoutTransition.layout,
              opacity: { duration: 0.3, ease: easeOut, delay: reduced ? 0 : index * 0.03 },
              y: { duration: 0.35, ease: easeOut, delay: reduced ? 0 : index * 0.03 },
            }}
            className={[
              "company-card",
              "company-card-elevated",
              isSelected && "company-card-expanded",
              isDimmed && "company-card-dimmed",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("a")) return;
              onSelect(isSelected ? null : c);
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter" && e.key !== " ") return;
              if ((e.target as HTMLElement).closest("a")) return;
              e.preventDefault();
              onSelect(isSelected ? null : c);
            }}
          >
            <div className="company-card-info">
              <div className="company-card-ticker">{c.ticker}</div>
              <div className="company-card-name">{c.name}</div>
              <div className="company-card-sector">{c.sector}</div>
            </div>

            <AnimatePresence initial={false}>
              {isSelected && (
                <motion.div
                  key="actions"
                  className="company-card-actions-wrap"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{
                    opacity: 1,
                    height: "auto",
                    transition: {
                      height: actionsEnter,
                      opacity: { duration: 0.16, ease: easeOut },
                    },
                  }}
                  exit={{
                    opacity: 0,
                    height: 0,
                    transition: { height: actionsExit, opacity: actionsExit },
                  }}
                >
                  <div className="company-card-actions">
                    <motion.div
                      initial={{ opacity: 0, y: 4, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.18, ease: easeOut, delay: 0.04 }}
                    >
                      <Link
                        href={`/chat?ticker=${c.ticker}`}
                        className="company-card-action-btn btn-green"
                      >
                        <MessageCircle size={12} strokeWidth={2.25} aria-hidden />
                        Ask
                      </Link>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 4, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.18, ease: easeOut, delay: 0.08 }}
                    >
                      <Link
                        href={`/report/${c.ticker}`}
                        className="company-card-action-btn btn-accent"
                      >
                        <FileText size={12} strokeWidth={2.25} aria-hidden />
                        Report
                      </Link>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
