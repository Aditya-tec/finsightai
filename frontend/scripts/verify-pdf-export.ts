/**
 * Headless PDF export smoke test — run from frontend/: npx tsx scripts/verify-pdf-export.ts
 */
import fs from "fs";
import path from "path";

import { buildReportPdfDoc, sanitizeForPdf } from "../lib/exportReportPdf";
import { formatGroupedCitations } from "../lib/citations";

const ROOT = path.resolve(import.meta.dirname, "../..");
const cachePath = path.join(
  ROOT,
  "backend/data/report_cache/v4-11sec/RELIANCE.json"
);

type CachedReport = {
  sections: Array<{
    title: string;
    body: string;
    citations: Array<{ source: string; page?: number; section?: string }>;
  }>;
};

const raw = fs.readFileSync(cachePath, "utf-8");
const cached = JSON.parse(raw) as CachedReport;

const doc = buildReportPdfDoc({
  ticker: "RELIANCE",
  companyName: "Reliance Industries",
  sector: "Oil & Gas",
  sections: cached.sections,
  evalScores: {
    grade: "B",
    faithfulness_score: 0.79,
    hallucination_detected: 1,
    hallucination_flags: "0.42,3.17,61.5",
    citation_accuracy: 1,
    answer_relevance: 1,
    sources_used: 1,
    total_claims: 86,
    verified_claims: 67,
  },
});

const outPath = path.join(ROOT, "data/rupeeread-report-RELIANCE-test.pdf");
const buf = Buffer.from(doc.output("arraybuffer"));
fs.writeFileSync(outPath, buf);

const pageCount = doc.getNumberOfPages();
const pageW = doc.internal.pageSize.getWidth();
const bodyBlob = cached.sections.map((s) => s.body).join(" ");
const hasRupeeInSource = bodyBlob.includes("₹");
const sanitizedSample = sanitizeForPdf(bodyBlob.slice(0, 500));
const rsOk = sanitizedSample.includes("Rs.") && !sanitizedSample.includes("₹");
const pdfSizeOk = buf.length > 10_000;
const sectionCount = cached.sections.length;

const citationSample = formatGroupedCitations(
  [{ source: "filing", page: 213 }, { source: "filing", page: 172 }, { source: "filing", page: 210 }],
  "SUNPHARMA"
);
const citationFormatOk =
  citationSample === "SUNPHARMA FY25 Annual Report, pg 213, 172, 210";

console.log("Citation format:", citationSample, citationFormatOk ? "OK" : "FAIL");
console.log("Pages:", pageCount);
console.log("Sections in PDF:", sectionCount, sectionCount === 11 ? "OK" : "FAIL");
console.log("PDF size:", buf.length, "bytes", pdfSizeOk ? "OK" : "FAIL");
console.log("Rs. sanitization:", rsOk ? "OK" : "FAIL");
console.log("Source has ₹ (sanitized in PDF):", hasRupeeInSource ? "OK" : "WARN");
console.log("Page width (A4 pt):", pageW, pageW > 500 && pageW < 620 ? "OK" : "FAIL");
console.log("Multi-page report:", pageCount >= 2 ? "OK" : "FAIL");

const failed = !pdfSizeOk || sectionCount !== 11 || pageCount < 2 || !rsOk || !citationFormatOk;
process.exit(failed ? 1 : 0);
