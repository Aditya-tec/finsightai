"use client";

import { formatInlineMarkdown } from "@/lib/formatText";

export default function FormattedText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return <span className={className}>{formatInlineMarkdown(text)}</span>;
}
