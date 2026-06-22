import argparse
import json
from pathlib import Path

import httpx

PDF_MAGIC = b"%PDF"


def load_url_config(path: Path) -> list[dict]:
    if not path.is_file():
        return []
    return json.loads(path.read_text(encoding="utf-8"))


def download_file(url: str, target: Path) -> bool:
    target.parent.mkdir(parents=True, exist_ok=True)
    try:
        with httpx.Client(timeout=60.0, follow_redirects=True) as client:
            resp = client.get(url)
            if resp.status_code != 200:
                return False
            content = resp.content
            if not content.startswith(PDF_MAGIC):
                print(f"  Not a PDF (skipped): {target.name}")
                return False
            target.write_bytes(content)
            return True
    except httpx.HTTPError as exc:
        print(f"  HTTP error: {exc}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Download Nifty 20 annual report PDFs")
    parser.add_argument("--config", default="scripts/bse_report_urls.json")
    parser.add_argument("--output", default="data/raw")
    parser.add_argument("--skip-existing", action="store_true", default=True)
    args = parser.parse_args()

    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)
    entries = load_url_config(Path(args.config))

    if not entries:
        print("No entries in config. Add pdf_url values to scripts/bse_report_urls.json")
        print("Or drop PDFs manually as data/raw/{TICKER}_FY25.pdf")
        return

    for entry in entries:
        ticker = entry["ticker"].upper()
        fy = entry.get("fiscal_year", "FY25")
        url = (entry.get("pdf_url") or "").strip()
        target = output_dir / f"{ticker}_{fy}.pdf"

        if not url:
            print(f"Skipped {ticker}: no pdf_url in config (manual drop: {target.name})")
            continue
        if args.skip_existing and target.is_file():
            print(f"Exists {ticker} -> {target}")
            continue
        ok = download_file(url, target)
        if ok:
            print(f"Downloaded {ticker} -> {target}")
        else:
            print(f"Failed {ticker}: check URL in config")


if __name__ == "__main__":
    main()
