"use client";

import { AnimatePresence, motion } from "framer-motion";
import FormattedText from "@/components/FormattedText";
import SectionViewToggle from "@/components/SectionViewToggle";
import { stripLeadingSectionTitle } from "@/lib/formatText";
import { formatGroupedCitations } from "@/lib/citations";
import { sectionKey } from "@/lib/bulletSummary";

type Citation = { source: string; page?: number; section?: string };

type Section = {
  title: string;
  body: string;
  citations: Citation[];
};

type Props = {
  section: Section;
  index: number;
  ticker: string;
  viewMode: "prose" | "bullets";
  bullets: string[] | undefined;
  loading: boolean;
  error?: string;
  onToggle: () => void;
};

export default function ReportSectionCard({
  section,
  index,
  ticker,
  viewMode,
  bullets,
  loading,
  error,
  onToggle,
}: Props) {
  const hasBullets = Boolean(bullets?.length);
  const proseText = stripLeadingSectionTitle(section.body, section.title);

  return (
    <div className="report-section" id={`section-${index}`}>
      <div className="report-section-head">
        <div className="report-section-head-left">
          <span className="report-section-num">{String(index + 1).padStart(2, "0")}</span>
          <span className="report-section-title">{section.title}</span>
        </div>
        <SectionViewToggle
          viewMode={viewMode}
          loading={loading}
          hasBullets={hasBullets}
          error={error}
          onToggle={onToggle}
        />
      </div>

      <div className="report-section-body">
        <AnimatePresence mode="wait" initial={false}>
          {viewMode === "bullets" && hasBullets ? (
            <motion.ul
              key={`bullets-${sectionKey(section.title)}`}
              className="report-bullet-list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
            >
              {bullets!.map((bullet, bi) => (
                <li key={bi}>
                  <FormattedText text={bullet} />
                </li>
              ))}
            </motion.ul>
          ) : (
            <motion.div
              key={`prose-${sectionKey(section.title)}`}
              className="report-section-body-fade"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
            >
              <FormattedText text={proseText} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {section.citations?.length > 0 && (
        <div className="report-sources">
          <span className="report-sources-label">Sources:</span>
          {formatGroupedCitations(section.citations, ticker)}
        </div>
      )}
    </div>
  );
}
