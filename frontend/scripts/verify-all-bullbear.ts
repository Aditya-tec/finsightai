import fs from "node:fs";
import path from "node:path";

import { parseBullBearBase } from "../lib/parseBullBearBase";

const cacheDir = path.join(import.meta.dirname, "../../backend/data/report_cache/v7-charts");
const files = fs.readdirSync(cacheDir).filter((f) => f.endsWith(".json"));

const BAD_START = /^[,;:]|^is\s+supported|^for\s|^on\s+the\s+other|^in\s+contrast|^the\s+['']?bull\s+vs/i;
const BAD_END = /(?:On the other hand|In contrast|However|Meanwhile),?\s*$/i;
const BOILERPLATE = /bull\s+vs\s+bear\s+vs\s+base\s+case.*(?:section|outlines|presents|scenario for)/i;

let ok = 0;
let fail = 0;
let skipped = 0;
const bad: string[] = [];

for (const file of files) {
  const ticker = file.replace(".json", "");
  const data = JSON.parse(fs.readFileSync(path.join(cacheDir, file), "utf-8")) as {
    sections: Array<{ title: string; body: string }>;
  };
  const sec = data.sections.find((s) => s.title === "Bull vs Bear vs Base Case");
  if (!sec) {
    skipped++;
    continue;
  }
  const blocks = parseBullBearBase(sec.body);
  if (!blocks) {
    skipped++;
    continue;
  }
  const issues: string[] = [];

  if (blocks.intro && BOILERPLATE.test(blocks.intro)) {
    issues.push("intro: section boilerplate");
  }

  for (const [k, text] of Object.entries({
    bull: blocks.bull,
    bear: blocks.bear,
    base: blocks.base,
  })) {
    if (!text) continue;
    const t = text.trim();
    if (BAD_START.test(t)) issues.push(`${k}: bad start "${t.slice(0, 35)}"`);
    if (BAD_END.test(t)) issues.push(`${k}: trailing connector`);
    if (t.length < 40) issues.push(`${k}: too short (${t.length})`);
    if (BOILERPLATE.test(t) && t.length < 180) issues.push(`${k}: boilerplate only`);
  }

  if (issues.length) {
    fail++;
    bad.push(`${ticker} -> ${issues.join("; ")}`);
  } else {
    ok++;
  }
}

console.log(
  `Cards parsed: ${ok + fail} | Clean: ${ok} | Issues: ${fail} | Prose fallback: ${skipped}`
);
for (const b of bad) console.log(" ", b);

const focus = ["ICICIBANK", "WIPRO", "SBIN", "RELIANCE"];
for (const ticker of focus) {
  const data = JSON.parse(
    fs.readFileSync(path.join(cacheDir, `${ticker}.json`), "utf-8")
  ) as { sections: Array<{ title: string; body: string }> };
  const sec = data.sections.find((s) => s.title === "Bull vs Bear vs Base Case");
  const blocks = sec ? parseBullBearBase(sec.body) : null;
  if (!blocks) continue;
  console.log(`\n${ticker}:`);
  console.log(`  intro: ${blocks.intro ? blocks.intro.slice(0, 60) + "..." : "(none)"}`);
  console.log(`  bull: ${blocks.bull?.slice(0, 72)}...`);
  console.log(`  bear: ${blocks.bear?.slice(0, 72)}...`);
  console.log(`  base: ${blocks.base?.slice(0, 72)}...`);
}

process.exit(fail > 0 ? 1 : 0);
