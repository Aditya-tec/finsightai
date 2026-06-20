"""Pre-generate disk-cached equity reports for all Nifty 20 tickers.

Resume-safe: skips tickers already cached unless --force is passed.
On Groq 429, exits cleanly so you can re-run the next day.
"""
from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from groq import RateLimitError

from agents.report_agent import build_report, disk_cache_exists
from routers.companies import NIFTY20

PRIORITY_TICKERS = ["RELIANCE", "SBIN", "INFY", "HDFCBANK", "TCS", "ICICIBANK"]
DEFAULT_DELAY_SEC = 3


def _ordered_tickers(explicit: list[str] | None) -> list[str]:
    if explicit:
        return [t.upper() for t in explicit]
    all_tickers = [c["ticker"] for c in NIFTY20]
    priority = [t for t in PRIORITY_TICKERS if t in all_tickers]
    rest = [t for t in all_tickers if t not in priority]
    return priority + rest


def main() -> int:
    parser = argparse.ArgumentParser(description="Warm disk report cache for Nifty 20 tickers.")
    parser.add_argument(
        "--tickers",
        help="Comma-separated tickers (default: all 20, priority six first)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Regenerate even if disk cache exists",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=DEFAULT_DELAY_SEC,
        help=f"Seconds to wait between tickers (default: {DEFAULT_DELAY_SEC})",
    )
    args = parser.parse_args()

    explicit = [t.strip() for t in args.tickers.split(",")] if args.tickers else None
    tickers = _ordered_tickers(explicit)

    print(f"Warming report cache for {len(tickers)} ticker(s)...")
    completed = 0
    skipped = 0

    for i, ticker in enumerate(tickers, start=1):
        if disk_cache_exists(ticker) and not args.force:
            print(f"[{i}/{len(tickers)}] {ticker} — SKIP (cached)")
            skipped += 1
            continue

        print(f"[{i}/{len(tickers)}] {ticker} — generating (11 Groq calls)...")
        try:
            sections, _ = build_report(ticker)
            print(f"  done — {len(sections)} sections written to disk")
            completed += 1
        except RateLimitError:
            print(
                "\nGroq rate limit hit (429). Resume tomorrow with the same command — "
                "cached tickers will be skipped automatically."
            )
            return 1
        except Exception as exc:
            print(f"  ERROR: {exc}")
            return 1

        if i < len(tickers) and args.delay > 0:
            time.sleep(args.delay)

    print(f"\nFinished: {completed} generated, {skipped} skipped (already cached).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
