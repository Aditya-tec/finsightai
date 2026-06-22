/**
 * Frontend parse smoke tests — run from frontend/: npx tsx scripts/verify-parse-metrics.ts
 */
import assert from "node:assert/strict";

import { formatBarSeriesTooltip, formatCroreAxisTick, pickCroreAxisUnit } from "../lib/chartTypes";
import { parseFinancialRatios } from "../lib/parseFinancialRatios";
import { parseKeyMetrics } from "../lib/parseKeyMetrics";

const execText =
  "Infosys achieved 6.1% revenue growth and a 21.1% operating margin. Return on equity of 29.0%.";

const ratiosText =
  "ROE is reported at 29.0%. The company achieved 6.1% revenue growth and 21.1% operating margin. Free cash flow growth of 44.8%.";

const metrics = parseKeyMetrics(execText);
assert(metrics?.items.length === 3, "expected 3 key metrics");

const ratios = parseFinancialRatios(ratiosText);
assert(ratios && ratios.length >= 3, "expected at least 3 ratios");

assert(pickCroreAxisUnit(162_990) === "k", "large values use k unit");
assert(
  formatCroreAxisTick(162_990, "k") === "₹163.0k Cr",
  "k tick formatting"
);
assert(
  formatBarSeriesTooltip("Revenue (₹ Cr)", 162_990, "FY25") ===
    "Revenue (FY25): ₹1,62,990 Cr",
  "FY tooltip"
);

console.log("Key metrics:", metrics?.items.map((m) => m.display).join(", "));
console.log("Ratios:", ratios?.map((r) => r.display).join(", "));
console.log("All parse metric checks passed.");
