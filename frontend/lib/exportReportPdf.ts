import { jsPDF } from "jspdf";

type Citation = { source: string; page?: number; section?: string };

type ReportSection = {
  title: string;
  body: string;
  citations: Citation[];
};

export type ExportReportPdfOptions = {
  ticker: string;
  companyName?: string;
  sections: ReportSection[];
  evalScores: Record<string, unknown>;
};

const MARGIN_LEFT = 50;
const MARGIN_RIGHT = 50;
const MARGIN_TOP_CONT = 56;
const SECTION_GAP = 24;
const CITATION_INDENT = 12;
const BODY_LINE_HEIGHT = 16;
const FOOTER_RESERVE = 72;

const BLACK: [number, number, number] = [0, 0, 0];

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

function formatCitation(c: Citation): string {
  const parts = [c.source];
  if (c.section) parts.push(c.section);
  if (c.page != null) parts.push(`pg ${c.page}`);
  return parts.join(" · ");
}

function estimateSectionHeight(
  doc: jsPDF,
  section: ReportSection,
  width: number
): number {
  const headerH = 28;
  const bodyLines = wrapText(doc, section.body, width - 8);
  const citationLines = section.citations.flatMap((c) =>
    wrapText(doc, formatCitation(c), width - CITATION_INDENT - 8)
  );
  return (
    headerH +
    10 +
    bodyLines.length * BODY_LINE_HEIGHT +
    (citationLines.length > 0 ? 6 + 16 + citationLines.length * 12 : 0) +
    SECTION_GAP
  );
}

function drawCoverHeader(
  doc: jsPDF,
  ticker: string,
  companyName: string | undefined,
  evalScores: Record<string, unknown>
): number {
  const width = maxTextWidth(doc);
  setBlack(doc);

  let y = 48;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("FinSight AI", MARGIN_LEFT, y);

  if (evalScores.grade != null) {
    doc.setFontSize(11);
    doc.text(`Grade ${String(evalScores.grade)}`, pageWidth(doc) - MARGIN_RIGHT, y, {
      align: "right",
    });
  }

  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Indian Equity Research Report", MARGIN_LEFT, y);

  y += 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  const companyLine = companyName ? `${companyName} (${ticker})` : ticker;
  y = drawWrappedBlock(doc, wrapText(doc, companyLine, width), MARGIN_LEFT, y, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const dateStr = new Date().toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  doc.text(`Generated ${dateStr}`, MARGIN_LEFT, y + 4);

  y += 20;
  doc.setLineWidth(0.5);
  doc.line(MARGIN_LEFT, y, pageWidth(doc) - MARGIN_RIGHT, y);
  return y + 24;
}

function drawSectionHeader(
  doc: jsPDF,
  sectionNum: string,
  title: string,
  y: number,
  width: number
): number {
  y = ensureSpace(doc, y, 36);
  setBlack(doc);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(sectionNum, MARGIN_LEFT, y);

  const numW = doc.getTextWidth(sectionNum) + 8;
  const titleLines = wrapText(doc, title, width - numW);
  if (titleLines.length === 1) {
    doc.text(titleLines[0], MARGIN_LEFT + numW, y);
    y += 16;
  } else {
    doc.text(titleLines[0], MARGIN_LEFT + numW, y);
    y += 14;
    for (let i = 1; i < titleLines.length; i++) {
      doc.text(titleLines[i], MARGIN_LEFT, y);
      y += 14;
    }
  }

  doc.setLineWidth(0.25);
  doc.line(MARGIN_LEFT, y + 2, MARGIN_LEFT + width, y + 2);
  return y + 14;
}

function drawSection(
  doc: jsPDF,
  section: ReportSection,
  index: number,
  y: number
): number {
  const width = maxTextWidth(doc);
  const sectionNum = String(index + 1).padStart(2, "0");
  y = ensureSpace(doc, y, Math.min(estimateSectionHeight(doc, section, width), 100));

  y = drawSectionHeader(doc, sectionNum, section.title, y, width);

  setBlack(doc);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  const bodyLines = wrapText(doc, section.body, width);
  y = drawWrappedBlock(doc, bodyLines, MARGIN_LEFT, y, BODY_LINE_HEIGHT);

  if (section.citations.length > 0) {
    y += 6;
    y = ensureSpace(doc, y, 20);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("Sources", MARGIN_LEFT + CITATION_INDENT, y);

    y += 16;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    for (const citation of section.citations) {
      const citeLines = wrapText(
        doc,
        formatCitation(citation),
        width - CITATION_INDENT
      );
      y = drawWrappedBlock(
        doc,
        citeLines.map((l) => `  ${l}`),
        MARGIN_LEFT + CITATION_INDENT,
        y,
        12
      );
    }
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
  sections,
  evalScores,
}: ExportReportPdfOptions): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  let y = drawCoverHeader(doc, ticker, companyName, evalScores);

  sections.forEach((section, i) => {
    y = drawSection(doc, section, i, y);
  });

  drawFooters(doc);
  return doc;
}

export function exportReportPdf(options: ExportReportPdfOptions): void {
  const doc = buildReportPdfDoc(options);
  doc.save(`finsight-report-${options.ticker}.pdf`);
}
