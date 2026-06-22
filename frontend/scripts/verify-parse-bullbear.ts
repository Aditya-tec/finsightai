/**
 * Bull/bear/base parse smoke test — run from frontend/: npx tsx scripts/verify-parse-bullbear.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { parseBullBearBase } from "../lib/parseBullBearBase";

const RELIANCE_BODY =
  "The bull case for Reliance Industries Limited is supported by the company's commitment to sustainability and digital transformation, as evident from its investments in clean energy, circular economy solutions, and advanced digital technologies. The company's focus on achieving Net Carbon Zero by 2035 and its efforts to promote inclusive growth through initiatives such as the \"Crafts of India\" program, which empowers over 50,000 artisans, demonstrate its dedication to responsible business practices. Additionally, Reliance Jio's leadership in India's digital transformation, with 488 million mobile and fixed broadband subscribers, including 191 million Jio True 5G users, positions the company for continued growth in the digital space.\n\nThe bear case, on the other hand, may cite the lack of specific financial metrics in the provided excerpts, making it challenging to assess the company's financial performance. However, it is notable that the company spent ₹2,156 crore towards corporate social responsibility (CSR) initiatives in FY 2024-25, which, while demonstrating its commitment to community empowerment, may be viewed as a significant expense. The base case scenario assumes that Reliance Industries Limited will continue to drive growth through its diversified business segments, including O2C, Retail, and Jio, while maintaining its focus on sustainability and digital transformation. With a strong foundation in India's growing economy and a commitment to responsible business practices, the company is well-positioned for long-term success, although a detailed financial analysis would be required to provide a more comprehensive assessment.";

const blocks = parseBullBearBase(RELIANCE_BODY);
assert(blocks, "expected scenario blocks");

assert(
  blocks!.bull!.startsWith("Reliance Industries Limited is supported"),
  `bull should start with company name, got: ${blocks!.bull!.slice(0, 40)}`
);
assert(
  blocks!.bear!.startsWith("May cite the lack"),
  `bear should start cleanly, got: ${blocks!.bear!.slice(0, 40)}`
);
assert(
  blocks!.base!.startsWith("Reliance Industries Limited will continue"),
  `base should start cleanly, got: ${blocks!.base!.slice(0, 40)}`
);
assert(!blocks!.bull!.startsWith("for Reliance"), "bull must not start mid-phrase");
assert(!blocks!.bear!.startsWith(","), "bear must not start with comma");
assert(!blocks!.base!.startsWith("scenario"), "base must not start with orphaned scenario");

const cachePath = path.join(
  import.meta.dirname,
  "../../backend/data/report_cache/v7-charts/RELIANCE.json"
);
if (fs.existsSync(cachePath)) {
  const cached = JSON.parse(fs.readFileSync(cachePath, "utf-8")) as {
    sections: Array<{ title: string; body: string }>;
  };
  const sec10 = cached.sections.find((s) => s.title === "Bull vs Bear vs Base Case");
  if (sec10) {
    const live = parseBullBearBase(sec10.body);
    assert(live?.bull && !live.bull.startsWith("for "), "cached RELIANCE bull parse OK");
  }
}

console.log("Bull:", blocks!.bull!.slice(0, 72) + "...");
console.log("Bear:", blocks!.bear!.slice(0, 72) + "...");
console.log("Base:", blocks!.base!.slice(0, 72) + "...");
console.log("All bull/bear/base parse checks passed.");
