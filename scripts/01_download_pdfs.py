import argparse
import json
from pathlib import Path

import httpx


def load_companies(path: Path) -> list[dict]:
    return json.loads(path.read_text(encoding="utf-8"))


def download_file(url: str, target: Path) -> bool:
    target.parent.mkdir(parents=True, exist_ok=True)
    try:
        with httpx.Client(timeout=30.0, follow_redirects=True) as client:
            resp = client.get(url)
            if resp.status_code != 200:
                return False
            target.write_bytes(resp.content)
            return True
    except httpx.HTTPError:
        return False


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--companies", default="scripts/nifty20_companies.json")
    parser.add_argument("--output", default="data/raw")
    args = parser.parse_args()

    companies = load_companies(Path(args.companies))
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Keep this script idempotent and simple. Add real BSE URLs when finalizing ingestion.
    for company in companies:
        ticker = company["ticker"]
        placeholder_url = f"https://example.com/{ticker}.pdf"
        target = output_dir / ticker / f"{ticker}_sample.pdf"
        ok = download_file(placeholder_url, target)
        if ok:
            print(f"Downloaded {ticker} -> {target}")
        else:
            print(f"Skipped {ticker}: configure real source URL")


if __name__ == "__main__":
    main()
