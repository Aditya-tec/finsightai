import type { jsPDF } from "jspdf";

import {
  CHART_COLORS,
  CHART_DISCLAIMER,
  type BarChartData,
  type DonutChartData,
  formatBarSeriesTooltip,
  formatChartValue,
  formatCroreAxisTick,
  formatCroreFull,
  maxBarDatasetValue,
  pickCroreAxisUnit,
} from "./chartTypes";
import type { ScenarioBlocks } from "./parseBullBearBase";

const PDF_CHART_HEIGHT = 200;
const PDF_CHART_GAP = 10;

function sanitizeForPdf(text: string): string {
  return text.replace(/\*\*/g, "").replace(/₹/g, "Rs. ");
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function drawPieWedge(
  doc: jsPDF,
  cx: number,
  cy: number,
  radius: number,
  startDeg: number,
  endDeg: number,
  fill: [number, number, number]
): void {
  if (endDeg - startDeg < 0.5) return;
  doc.setFillColor(fill[0], fill[1], fill[2]);
  doc.setDrawColor(fill[0], fill[1], fill[2]);
  const step = 3;
  for (let a = startDeg; a < endDeg; a += step) {
    const a2 = Math.min(a + step, endDeg);
    const [x1, y1] = polar(cx, cy, radius, a);
    const [x2, y2] = polar(cx, cy, radius, a2);
    doc.triangle(cx, cy, x1, y1, x2, y2, "F");
  }
}

export function pdfChartBlockHeight(hasChart: boolean): number {
  if (!hasChart) return 0;
  return PDF_CHART_HEIGHT + PDF_CHART_GAP + 28;
}

export function drawBarChartPdf(
  doc: jsPDF,
  data: BarChartData,
  x: number,
  y: number,
  width: number
): number {
  const chartH = PDF_CHART_HEIGHT;
  const dualAxis = data.datasets.length >= 2;
  const padLeft = 48;
  const padRight = dualAxis ? 48 : 8;
  const padBottom = 28;
  const padTop = 12;
  const plotW = width - padLeft - padRight;
  const plotH = chartH - padBottom - padTop;
  const originX = x + padLeft;
  const originY = y + padTop + plotH;
  const rightAxisX = originX + plotW;

  const seriesMax = data.datasets.map((ds) => Math.max(...ds.values, 1));
  const leftUnit = pickCroreAxisUnit(maxBarDatasetValue(data.datasets[0].values));
  const rightUnit = dualAxis
    ? pickCroreAxisUnit(maxBarDatasetValue(data.datasets[1].values))
    : leftUnit;

  const groupCount = data.labels.length;
  const seriesCount = data.datasets.length;
  const groupW = plotW / groupCount;
  const barGap = 4;
  const barW = Math.min(28, (groupW - barGap * (seriesCount + 1)) / seriesCount);

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.25);
  doc.line(originX, originY, originX + plotW, originY);
  doc.line(originX, originY, originX, originY - plotH);
  if (dualAxis) {
    doc.line(rightAxisX, originY, rightAxisX, originY - plotH);
  }

  data.labels.forEach((label, gi) => {
    const groupX = originX + gi * groupW + groupW / 2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(96, 96, 96);
    doc.text(label, groupX, originY + 14, { align: "center" });

    data.datasets.forEach((ds, si) => {
      const val = ds.values[gi];
      const maxVal = seriesMax[si];
      const barH = (val / maxVal) * plotH;
      const bx =
        originX + gi * groupW + barGap + si * (barW + barGap) + (groupW - seriesCount * (barW + barGap) - barGap) / 2;
      const by = originY - barH;
      const [r, g, b] = hexToRgb(CHART_COLORS[si % CHART_COLORS.length]);
      doc.setFillColor(r, g, b);
      doc.rect(bx, by, barW, barH, "F");
    });
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(128, 128, 128);
  doc.text(formatCroreAxisTick(seriesMax[0], leftUnit), originX - 4, originY - plotH + 4, {
    align: "right",
  });
  doc.text("0", originX - 4, originY, { align: "right" });

  if (dualAxis) {
    doc.text(formatCroreAxisTick(seriesMax[1], rightUnit), rightAxisX + 4, originY - plotH + 4, {
      align: "left",
    });
    doc.text("0", rightAxisX + 4, originY, { align: "left" });
  }

  let legendY = y + 8;
  data.datasets.forEach((ds, i) => {
    const [r, g, b] = hexToRgb(CHART_COLORS[i % CHART_COLORS.length]);
    doc.setFillColor(r, g, b);
    doc.rect(x + width - 148, legendY, 8, 8, "F");
    doc.setTextColor(64, 64, 64);
    doc.setFontSize(7.5);
    const peak = Math.max(...ds.values);
    doc.text(sanitizeForPdf(formatBarSeriesTooltip(ds.label, peak)), x + width - 136, legendY + 7);
    legendY += 12;
  });

  doc.setTextColor(0, 0, 0);
  return y + chartH + PDF_CHART_GAP;
}

export function drawDonutChartPdf(
  doc: jsPDF,
  data: DonutChartData,
  x: number,
  y: number,
  width: number
): number {
  const chartH = PDF_CHART_HEIGHT;
  const cx = x + width * 0.32;
  const cy = y + chartH / 2;
  const outerR = 72;
  const innerR = 40;
  const total = data.segments.reduce((s, seg) => s + seg.value, 0);

  let angle = -90;
  data.segments.forEach((seg, i) => {
    const slice = (seg.value / total) * 360;
    drawPieWedge(doc, cx, cy, outerR, angle, angle + slice, hexToRgb(CHART_COLORS[i % CHART_COLORS.length]));
    angle += slice;
  });

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(255, 255, 255);
  doc.circle(cx, cy, innerR, "F");

  let legendY = y + 24;
  const legendX = x + width * 0.55;
  data.segments.forEach((seg, i) => {
    const [r, g, b] = hexToRgb(CHART_COLORS[i % CHART_COLORS.length]);
    doc.setFillColor(r, g, b);
    doc.rect(legendX, legendY - 6, 8, 8, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(64, 64, 64);
    const label = sanitizeForPdf(`${seg.label}: ${formatCroreFull(seg.value)}`);
    const lines = doc.splitTextToSize(label, width - (legendX - x) - 8) as string[];
    doc.text(lines[0], legendX + 12, legendY);
    if (lines.length > 1) {
      legendY += 10;
      doc.text(lines[1], legendX + 12, legendY);
    }
    legendY += 14;
  });

  doc.setTextColor(0, 0, 0);
  return y + chartH + PDF_CHART_GAP;
}

export function drawChartDisclaimerPdf(
  doc: jsPDF,
  x: number,
  y: number,
  width: number
): number {
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(128, 128, 128);
  const lines = doc.splitTextToSize(sanitizeForPdf(CHART_DISCLAIMER), width) as string[];
  let cy = y;
  for (const line of lines) {
    doc.text(line, x, cy);
    cy += 10;
  }
  doc.setTextColor(0, 0, 0);
  return cy + 6;
}

export function scenarioCardsPdfHeight(
  doc: jsPDF,
  blocks: ScenarioBlocks,
  width: number
): number {
  const colW = (width - 16) / 3;
  let maxH = 0;
  for (const key of ["bull", "bear", "base"] as const) {
    const text = blocks[key];
    if (!text) continue;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(sanitizeForPdf(text), colW - 16) as string[];
    maxH = Math.max(maxH, 28 + lines.length * 11);
  }
  const introH = blocks.intro
    ? (doc.splitTextToSize(sanitizeForPdf(blocks.intro), width) as string[]).length * 12 + 8
    : 0;
  return introH + maxH + 12;
}

export function drawScenarioCardsPdf(
  doc: jsPDF,
  blocks: ScenarioBlocks,
  x: number,
  y: number,
  width: number
): number {
  let cy = y;

  if (blocks.intro) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(96, 96, 96);
    const introLines = doc.splitTextToSize(sanitizeForPdf(blocks.intro), width) as string[];
    for (const line of introLines) {
      doc.text(line, x, cy);
      cy += 12;
    }
    cy += 6;
    doc.setTextColor(0, 0, 0);
  }

  const colW = (width - 16) / 3;
  const cards: { key: "bull" | "bear" | "base"; label: string; accent: [number, number, number] }[] = [
    { key: "bull", label: "BULL CASE", accent: [0, 153, 255] },
    { key: "bear", label: "BEAR CASE", accent: [102, 102, 102] },
    { key: "base", label: "BASE CASE", accent: [77, 184, 255] },
  ];

  let maxCardH = 0;
  const cardBodies: { lines: string[]; h: number }[] = [];

  for (const card of cards) {
    const text = blocks[card.key];
    if (!text) {
      cardBodies.push({ lines: [], h: 0 });
      continue;
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(sanitizeForPdf(text), colW - 16) as string[];
    const h = 28 + lines.length * 11;
    cardBodies.push({ lines, h });
    maxCardH = Math.max(maxCardH, h);
  }

  cards.forEach((card, i) => {
    const body = cardBodies[i];
    if (!body.lines.length) return;
    const cx = x + i * (colW + 8);
    const [ar, ag, ab] = card.accent;

    doc.setDrawColor(ar, ag, ab);
    doc.setLineWidth(1);
    doc.setFillColor(245, 245, 245);
    doc.rect(cx, cy, colW, maxCardH, "FD");

    doc.setFillColor(ar, ag, ab);
    doc.rect(cx, cy, colW, 3, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(ar, ag, ab);
    doc.text(card.label, cx + 10, cy + 16);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(64, 64, 64);
    let ty = cy + 28;
    for (const line of body.lines) {
      doc.text(line, cx + 10, ty);
      ty += 11;
    }
  });

  doc.setTextColor(0, 0, 0);
  return cy + maxCardH + 12;
}
