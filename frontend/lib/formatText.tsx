import { Fragment, type ReactNode } from "react";

/** Remove repeated section title from the start of LLM body text. */
export function stripLeadingSectionTitle(body: string, title: string): string {
  let text = body.trim();
  const normalizedTitle = title.trim();
  if (!normalizedTitle) return text;

  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const titleEsc = escape(normalizedTitle);

  const patterns = [
    new RegExp(`^\\*\\*${titleEsc}\\*\\*\\s*\\n*`, "i"),
    new RegExp(`^${titleEsc}\\s*\\n+`, "i"),
    new RegExp(`^\\*\\*${titleEsc}\\*\\*\\s*`, "i"),
  ];

  for (const re of patterns) {
    text = text.replace(re, "").trim();
  }

  const plusParts = normalizedTitle.split(/\s*\+\s*/);
  if (plusParts.length > 1) {
    for (const part of plusParts) {
      const p = part.trim();
      if (!p) continue;
      const partEsc = escape(p);
      text = text.replace(new RegExp(`^\\*\\*${partEsc}\\*\\*\\s*\\n*`, "i"), "").trim();
    }
  }

  return text.trim();
}

/** Strip raw markdown markers for plain display (PDF, etc.). */
export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*/g, "")
    .replace(/\*(?!\s)/g, "")
    .replace(/#{1,6}\s/g, "")
    .trim();
}

/** Render simple inline markdown: **bold** only; strips stray **. */
export function formatInlineMarkdown(text: string): ReactNode[] {
  let remaining = text;
  const nodes: ReactNode[] = [];
  let key = 0;

  while (remaining.length > 0) {
    const start = remaining.indexOf("**");
    if (start === -1) {
      nodes.push(<Fragment key={key++}>{remaining}</Fragment>);
      break;
    }
    if (start > 0) {
      nodes.push(<Fragment key={key++}>{remaining.slice(0, start)}</Fragment>);
    }
    const end = remaining.indexOf("**", start + 2);
    if (end === -1) {
      nodes.push(<Fragment key={key++}>{remaining.slice(start).replace(/\*\*/g, "")}</Fragment>);
      break;
    }
    nodes.push(<strong key={key++}>{remaining.slice(start + 2, end)}</strong>);
    remaining = remaining.slice(end + 2);
  }

  return nodes;
}
