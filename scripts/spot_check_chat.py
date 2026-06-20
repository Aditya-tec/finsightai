"""Quick pre-deploy chat spot-check (run from project root)."""
from __future__ import annotations

import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from agents.orchestrator import run_chat
from agents.report_agent import build_report, disk_cache_exists

TESTS = [
    ("RELIANCE", "What was O2C segment revenue in FY25?"),
    ("HDFCBANK", "What is the bank gross NPA ratio?"),
    ("INFY", "How did revenue change YoY?"),
    ("MARUTI", "What were total vehicle sales?"),
    (None, "What is Apple FY25 revenue?"),
]


def main() -> int:
    assert disk_cache_exists("RELIANCE"), "RELIANCE disk cache missing"
    t0 = time.time()
    sections, _ = build_report("RELIANCE")
    elapsed = time.time() - t0
    print(f"Disk cache: RELIANCE loaded in {elapsed:.2f}s, {len(sections)} sections")
    assert len(sections) == 11

    passed = 0
    failed = 0
    for ticker, query in TESTS:
        label = ticker or "NO_TICKER"
        try:
            result = run_chat(query, ticker=ticker)
            preview = result["answer"][:180].replace("\n", " ")
            cites = len(result.get("citations", []))
            print(f"OK [{label}] cites={cites}: {preview}...")
            passed += 1
        except Exception as exc:
            print(f"FAIL [{label}]: {type(exc).__name__}: {exc}")
            failed += 1

    print(f"\nChat spot-check: {passed} passed, {failed} failed")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
