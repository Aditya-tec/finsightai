import { jsPDF } from "jspdf";

import { formatGroupedCitations, type Citation } from "./citations";

type ReportSection = {
  title: string;
  body: string;
  citations: Citation[];
};

export type ExportReportPdfOptions = {
  ticker: string;
  companyName?: string;
  sector?: string;
  sections: ReportSection[];
  evalScores: Record<string, unknown>;
};

const MARGIN_LEFT = 50;
const MARGIN_RIGHT = 50;
const MARGIN_TOP_CONT = 56;
const SECTION_GAP = 12;
const CITATION_INDENT = 12;
const BODY_LINE_HEIGHT = 16;
const SECTION_HEADER_RULE_TEXT_GAP = 5;
const SECTION_HEADER_TITLE_DESCENT = 3;
const SECTION_HEADER_TITLE_RULE_GAP = 3;
const SECTION_BODY_TOP_GAP = 16;
const SECTION_TITLE_LINE_HEIGHT = 14;
const COVER_SUBTITLE_TO_RULE = 11;
const COVER_RULE_TO_COMPANY = 11;
const COVER_COMPANY_FONT_SIZE = 30;
const FOOTER_RESERVE = 72;

const BLACK: [number, number, number] = [0, 0, 0];
const GRAY_BODY: [number, number, number] = [96, 96, 96];
const GRAY_META: [number, number, number] = [128, 128, 128];
const GRAY_FILL: [number, number, number] = [245, 245, 245];

function pageWidth(doc: jsPDF): number {
  return doc.internal.pageSize.getWidth();
}

function pageHeight(doc: jsPDF): number {
  return doc.internal.pageSize.getHeight();
}

function maxTextWidth(doc: jsPDF): number {
  return pageWidth(doc) - MARGIN_LEFT - MARGIN_RIGHT;
}

function contentBottom(doc: jsPDF): number {
  return pageHeight(doc) - FOOTER_RESERVE;
}

export function sanitizeForPdf(text: string): string {
  return text.replace(/\*\*/g, "").replace(/₹/g, "Rs. ");
}

function wrapText(doc: jsPDF, text: string, width: number): string[] {
  return doc.splitTextToSize(sanitizeForPdf(text), width) as string[];
}

function setBlack(doc: jsPDF): void {
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
}

function setGray(doc: jsPDF, gray: [number, number, number]): void {
  doc.setTextColor(gray[0], gray[1], gray[2]);
  doc.setDrawColor(gray[0], gray[1], gray[2]);
}

function drawLogoMark(doc: jsPDF, x: number, baselineY: number, size = 7): void {
  setBlack(doc);
  doc.setFillColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.rect(x, baselineY - size + 1, size, size, "F");
}

/** Draws a bordered grade stamp on the right; returns the left edge of the badge box. */
function drawGradeBadge(doc: jsPDF, grade: string, rightX: number, baselineY: number): number {
  const label = `GRADE ${grade}`;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  const padX = 7;
  const textW = doc.getTextWidth(label);
  const boxW = textW + padX * 2;
  const boxH = 15;
  const boxX = rightX - boxW;
  const boxTop = baselineY - 10;

  setBlack(doc);
  doc.setFillColor(GRAY_FILL[0], GRAY_FILL[1], GRAY_FILL[2]);
  doc.setLineWidth(0.5);
  doc.rect(boxX, boxTop, boxW, boxH, "FD");

  setBlack(doc);
  doc.text(label, boxX + padX, baselineY);
  return boxX;
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > contentBottom(doc)) {
    doc.addPage();
    return MARGIN_TOP_CONT;
  }
  return y;
}

function drawWrappedBlock(
  doc: jsPDF,
  lines: string[],
  x: number,
  y: number,
  lineHeight: number
): number {
  for (const line of lines) {
    y = ensureSpace(doc, y, lineHeight);
    doc.text(line, x, y);
    y += lineHeight;
  }
  return y;
}

function groupedCitationLines(
  doc: jsPDF,
  citations: Citation[],
  ticker: string,
  width: number
): string[] {
  const text = formatGroupedCitations(citations, ticker);
  if (!text) return [];
  return wrapText(doc, `Sources: ${text}`, width);
}

function sectionHeaderHeight(doc: jsPDF, title: string, width: number): number {
  setBlack(doc);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  const numW = doc.getTextWidth("00") + 8;
  const titleLines = wrapText(doc, title, width - numW);
  return (
    SECTION_HEADER_RULE_TEXT_GAP +
    10 +
    (titleLines.length - 1) * SECTION_TITLE_LINE_HEIGHT +
    SECTION_HEADER_TITLE_DESCENT +
    SECTION_HEADER_TITLE_RULE_GAP +
    SECTION_BODY_TOP_GAP
  );
}

function estimateSectionHeight(
  doc: jsPDF,
  section: ReportSection,
  ticker: string,
  width: number
): number {
  const headerH = sectionHeaderHeight(doc, section.title, width);
  const bodyLines = wrapText(doc, section.body, width - 8);
  const citationLines =
    section.citations.length > 0
      ? groupedCitationLines(doc, section.citations, ticker, width - CITATION_INDENT - 8)
      : [];
  return (
    headerH +
    bodyLines.length * BODY_LINE_HEIGHT +
    (citationLines.length > 0 ? 6 + citationLines.length * 12 : 0) +
    SECTION_GAP
  );
}

/** Returns total width reserved for the grade badge at the right margin. */
function gradeBadgeWidth(doc: jsPDF, grade: string): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  return doc.getTextWidth(`GRADE ${grade}`) + 22;
}

function drawCoverHeader(
  doc: jsPDF,
  ticker: string,
  companyName: string | undefined,
  evalScores: Record<string, unknown>
): number {
  const width = maxTextWidth(doc);
  const pageRight = pageWidth(doc) - MARGIN_RIGHT;
  const dateStr = new Date().toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const dateText = `Generated ${dateStr}`;

  let y = 48;

  drawLogoMark(doc, MARGIN_LEFT, y, 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setBlack(doc);
  doc.text("FINSIGHT AI", MARGIN_LEFT + 11, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setGray(doc, GRAY_META);
  doc.text(dateText, pageRight, y, { align: "right" });

  y += 12;
  doc.text("Indian Equity Research Report", MARGIN_LEFT, y);

  y += COVER_SUBTITLE_TO_RULE;
  setBlack(doc);
  doc.setLineWidth(0.25);
  doc.line(MARGIN_LEFT, y, pageRight, y);

  y += COVER_RULE_TO_COMPANY + COVER_COMPANY_FONT_SIZE * 0.72;
  const displayName = companyName ?? ticker;
  const companyBaseline = y;
  const grade = evalScores.grade != null ? String(evalScores.grade).toUpperCase() : null;
  const nameWidth = grade != null ? width - gradeBadgeWidth(doc, grade) : width;

  if (grade != null) {
    drawGradeBadge(doc, grade, pageRight, companyBaseline);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(COVER_COMPANY_FONT_SIZE);
  setBlack(doc);
  y = drawWrappedBlock(doc, wrapText(doc, displayName, nameWidth), MARGIN_LEFT, companyBaseline, 34);

  return y + 10;
}

function drawSectionHeader(
  doc: jsPDF,
  sectionNum: string,
  title: string,
  y: number,
  width: number
): number {
  y = ensureSpace(doc, y, sectionHeaderHeight(doc, title, width));
  setBlack(doc);
  doc.setLineWidth(0.25);

  doc.line(MARGIN_LEFT, y, MARGIN_LEFT + width, y);
  let textY = y + SECTION_HEADER_RULE_TEXT_GAP + 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(sectionNum, MARGIN_LEFT, textY);

  const numW = doc.getTextWidth(sectionNum) + 8;
  const titleLines = wrapText(doc, title, width - numW);
  if (titleLines.length === 1) {
    doc.text(titleLines[0], MARGIN_LEFT + numW, textY);
  } else {
    doc.text(titleLines[0], MARGIN_LEFT + numW, textY);
    for (let i = 1; i < titleLines.length; i++) {
      textY += SECTION_TITLE_LINE_HEIGHT;
      doc.text(titleLines[i], MARGIN_LEFT, textY);
    }
  }

  const bottomRuleY =
    textY + SECTION_HEADER_TITLE_DESCENT + SECTION_HEADER_TITLE_RULE_GAP;
  doc.line(MARGIN_LEFT, bottomRuleY, MARGIN_LEFT + width, bottomRuleY);
  return bottomRuleY + SECTION_BODY_TOP_GAP;
}

function drawSection(
  doc: jsPDF,
  section: ReportSection,
  index: number,
  ticker: string,
  y: number
): number {
  const width = maxTextWidth(doc);
  const sectionNum = String(index + 1).padStart(2, "0");
  y = ensureSpace(doc, y, Math.min(estimateSectionHeight(doc, section, ticker, width), 100));

  y = drawSectionHeader(doc, sectionNum, section.title, y, width);

  setBlack(doc);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  const bodyLines = wrapText(doc, section.body, width);
  y = drawWrappedBlock(doc, bodyLines, MARGIN_LEFT, y, BODY_LINE_HEIGHT);

  if (section.citations.length > 0) {
    y += 6;
    const citeLines = groupedCitationLines(
      doc,
      section.citations,
      ticker,
      width - CITATION_INDENT - 8
    );
    y = ensureSpace(doc, y, citeLines.length * 12 + 4);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    y = drawWrappedBlock(doc, citeLines, MARGIN_LEFT + CITATION_INDENT, y, 12);
  }

  return y + SECTION_GAP;
}

function drawFooters(doc: jsPDF): void {
  const total = doc.getNumberOfPages();
  const disclaimer = "Report prepared by FinSight AI. Not investment advice.";

  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    setBlack(doc);
    const footerTop = pageHeight(doc) - FOOTER_RESERVE + 8;

    doc.setLineWidth(0.25);
    doc.line(MARGIN_LEFT, footerTop, pageWidth(doc) - MARGIN_RIGHT, footerTop);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Page ${i} of ${total}`, pageWidth(doc) / 2, footerTop + 12, {
      align: "center",
    });

    const discLines = wrapText(doc, disclaimer, maxTextWidth(doc));
    let discY = footerTop + 22;
    for (const line of discLines) {
      doc.text(line, MARGIN_LEFT, discY);
      discY += 10;
    }
  }
}

export function buildReportPdfDoc({
  ticker,
  companyName,
  sector,
  sections,
  evalScores,
}: ExportReportPdfOptions): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  let y = drawCoverHeader(doc, ticker, companyName, evalScores);

  sections.forEach((section, i) => {
    y = drawSection(doc, section, i, ticker, y);
  });

  drawFooters(doc);
  return doc;
}

export function exportReportPdf(options: ExportReportPdfOptions): void {
  const doc = buildReportPdfDoc(options);
  doc.save(`finsight-report-${options.ticker}.pdf`);
}
