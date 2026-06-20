"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ReactNode } from "react";

import { easeOut } from "@/lib/motion";

type Props = {
  children: ReactNode;
  delay?: number;
  className?: string;
};

export default function FadeSlideIn({ children, delay = 0, className }: Props) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: easeOut, delay }}
    >
      {children}
    </motion.div>
  );
}
