"""Upload annual report PDFs and parsed JSON to Supabase Storage.

Prerequisites:
  1. Run backend/supabase_storage.sql in Supabase SQL Editor (creates bucket).
  2. Set SUPABASE_URL and SUPABASE_KEY in backend/.env (service role key).

Usage (from repo root):
  python scripts/upload_filings_supabase.py
  python scripts/upload_filings_supabase.py --tickers MARUTI TCS --fiscal-year FY25
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))

from services.filing_storage import (  # noqa: E402
    storage_object_name,
    upload_bytes,
)
from document_corpus import normalize_fy, normalize_ticker  # noqa: E402

PDF_MAGIC = b"%PDF"


def _load_tickers(path: Path) -> list[str]:
    if not path.is_file():
        return []
    import json

    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, list):
        return [str(item.get("ticker", item)).upper() for item in data if item]
    return []


def main() -> None:
    parser = argparse.ArgumentParser(description="Upload filing PDFs/parsed JSON to Supabase Storage")
    parser.add_argument("--raw-dir", default="data/raw", help="Local PDF directory")
    parser.add_argument("--parsed-dir", default="data/parsed", help="Local parsed JSON directory")
    parser.add_argument("--fiscal-year", default="FY25")
    parser.add_argument("--tickers", nargs="*", help="Optional ticker subset")
    parser.add_argument(
        "--companies",
        default="scripts/nifty20_companies.json",
        help="Ticker list when --tickers not set",
    )
    args = parser.parse_args()

    raw_dir = ROOT / args.raw_dir
    parsed_dir = ROOT / args.parsed_dir
    fy = normalize_fy(args.fiscal_year)
    tickers = [normalize_ticker(t) for t in args.tickers] if args.tickers else _load_tickers(ROOT / args.companies)
    if not tickers:
        print("No tickers. Pass --tickers or provide scripts/nifty20_companies.json")
        sys.exit(1)

    uploaded_pdf = 0
    uploaded_parsed = 0
    missing = 0

    for ticker in tickers:
        pdf_local = raw_dir / f"{ticker}_{fy}.pdf"
        parsed_local = parsed_dir / f"{ticker}_{fy}.json"

        if pdf_local.is_file():
            payload = pdf_local.read_bytes()
            if not payload.startswith(PDF_MAGIC):
                print(f"  SKIP {pdf_local.name} (not a PDF)")
            elif upload_bytes(storage_object_name(ticker, fy, kind="pdf"), payload, "application/pdf"):
                print(f"  PDF   {pdf_local.name}")
                uploaded_pdf += 1
            else:
                print(f"  FAIL  {pdf_local.name}")
        else:
            print(f"  MISS  PDF {ticker}_{fy}.pdf")
            missing += 1

        if parsed_local.is_file():
            payload = parsed_local.read_bytes()
            if upload_bytes(
                storage_object_name(ticker, fy, kind="parsed"),
                payload,
                "application/json",
            ):
                print(f"  JSON  {parsed_local.name}")
                uploaded_parsed += 1
            else:
                print(f"  FAIL  {parsed_local.name}")

    print(f"\nDone: {uploaded_pdf} PDFs, {uploaded_parsed} parsed JSON files uploaded ({missing} PDFs missing locally).")
    if missing:
        print("Run scripts/01_download_pdfs.py then scripts/02_parse_pdfs.py for missing files.")


if __name__ == "__main__":
    main()
