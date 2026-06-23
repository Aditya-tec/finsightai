"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo } from "react";

import BullBearBaseCards from "@/components/BullBearBaseCards";
import CitationLinks from "@/components/CitationLinks";
import FormattedText from "@/components/FormattedText";
import KeyMetricsStrip from "@/components/KeyMetricsStrip";
import RatioIndicators from "@/components/RatioIndicators";
import SectionChart from "@/components/SectionChart";
import SectionViewToggle from "@/components/SectionViewToggle";
import {
  parseChartData,
  SECTION_BULL_BEAR,
  SECTION_BUSINESS,
  SECTION_EXECUTIVE,
  SECTION_FINANCIAL,
  SECTION_RATIOS,
} from "@/lib/chartTypes";
import type { Citation } from "@/lib/citations";
import { stripLeadingSectionTitle } from "@/lib/formatText";
import { sectionKey } from "@/lib/bulletSummary";
import { parseFinancialRatios } from "@/lib/parseFinancialRatios";
import { parseKeyMetrics } from "@/lib/parseKeyMetrics";
import { hasScenarioCards, isUnavailableScenarioText, parseBullBearBase } from "@/lib/parseBullBearBase";

type CitationType = Citation;

type Section = {
  title: string;
  body: string;
  citations: CitationType[];
  chart_data?: unknown;
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
  const chartData = useMemo(() => parseChartData(section.chart_data), [section.chart_data]);
  const scenarioBlocks = useMemo(
    () => (section.title === SECTION_BULL_BEAR ? parseBullBearBase(proseText) : null),
    [section.title, proseText]
  );
  const keyMetrics = useMemo(
    () =>
      section.title === SECTION_EXECUTIVE
        ? parseKeyMetrics(proseText, bullets)
        : null,
    [section.title, proseText, bullets]
  );
  const financialRatios = useMemo(
    () => (section.title === SECTION_RATIOS ? parseFinancialRatios(proseText) : null),
    [section.title, proseText]
  );
  const showScenarioCards = hasScenarioCards(scenarioBlocks);
  const scenarioUnavailable =
    section.title === SECTION_BULL_BEAR && isUnavailableScenarioText(proseText);
  const showChart = viewMode === "prose" && chartData !== null;
  const isChartSection =
    section.title === SECTION_BUSINESS || section.title === SECTION_FINANCIAL;
  const showChartUnavailable = viewMode === "prose" && isChartSection && chartData === null;
  const chartUnavailableMessage =
    section.title === SECTION_FINANCIAL
      ? "Chart unavailable — FY24/FY25 figures not found in indexed filing excerpts."
      : "Segment breakdown chart unavailable — fewer than two segments with explicit revenue in filing excerpts.";
  const showKeyMetrics = Boolean(keyMetrics);
  const showRatios = viewMode === "prose" && Boolean(financialRatios?.length);

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
        {scenarioUnavailable && (
          <p className="scenario-unavailable-note">
            Detailed bull/bear/base scenarios are not available from the indexed filing excerpts.
          </p>
        )}
        {showKeyMetrics && keyMetrics && <KeyMetricsStrip metrics={keyMetrics} />}

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
          ) : showScenarioCards ? (
            <motion.div
              key={`scenarios-${sectionKey(section.title)}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
            >
              <BullBearBaseCards blocks={scenarioBlocks} />
            </motion.div>
          ) : (
            <motion.div
              key={`prose-${sectionKey(section.title)}`}
              className="report-section-body-fade"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.2,
                ease: [0, 0, 0.2, 1],
              }}
            >
              <FormattedText text={proseText} />
            </motion.div>
          )}
        </AnimatePresence>

        {showRatios && financialRatios && <RatioIndicators ratios={financialRatios} />}
        {showChart && chartData && <SectionChart data={chartData} />}
        {showChartUnavailable && (
          <div className="chart-unavailable panel-elevated">
            {chartUnavailableMessage}
          </div>
        )}
      </div>

      {section.citations?.length > 0 && (
        <div className="report-sources">
          <span className="report-sources-label">Sources:</span>
          <CitationLinks citations={section.citations} ticker={ticker} />
        </div>
      )}
    </div>
  );
}
