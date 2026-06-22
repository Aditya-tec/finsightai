/**
 * PDF chart export smoke test — run from frontend/: npx tsx scripts/verify-pdf-charts.ts
 */
import fs from "fs";
import path from "path";

import { parseChartData, SECTION_BULL_BEAR } from "../lib/chartTypes";
import { buildReportPdfDoc } from "../lib/exportReportPdf";
import { hasScenarioCards, parseBullBearBase } from "../lib/parseBullBearBase";

const ROOT = path.resolve(import.meta.dirname, "../..");
const cachePath = path.join(ROOT, "backend/data/report_cache/v6-charts/INFY.json");

type CachedReport = {
  sections: Array<{
    title: string;
    body: string;
    citations: Array<{ source: string; page?: number; section?: string }>;
    chart_data?: unknown;
  }>;
};

const cached = JSON.parse(fs.readFileSync(cachePath, "utf-8")) as CachedReport;
const chartTitles = cached.sections
  .filter((s) => parseChartData(s.chart_data))
  .map((s) => s.title);
const scenarioSection = cached.sections.find((s) => s.title === SECTION_BULL_BEAR);
const scenarioOk = scenarioSection
  ? hasScenarioCards(parseBullBearBase(scenarioSection.body))
  : false;

const doc = buildReportPdfDoc({
  ticker: "INFY",
  companyName: "Infosys",
  sections: cached.sections,
  evalScores: { grade: "A" },
});

const buf = Buffer.from(doc.output("arraybuffer"));
const outPath = path.join(ROOT, "data/rupeeread-report-INFY-charts-test.pdf");
fs.writeFileSync(outPath, buf);

const pageCount = doc.getNumberOfPages();
const pdfSizeOk = buf.length > 15_000;
const chartsOk = chartTitles.length >= 2;

console.log("Chart sections:", chartTitles.join(", "), chartsOk ? "OK" : "FAIL");
console.log("Scenario cards parse:", scenarioOk ? "OK" : "FAIL");
console.log("Pages:", pageCount, pageCount >= 3 ? "OK" : "WARN");
console.log("PDF size:", buf.length, "bytes", pdfSizeOk ? "OK" : "FAIL");
console.log("Written:", outPath);

const failed = !chartsOk || !pdfSizeOk || !scenarioOk;
process.exit(failed ? 1 : 0);
