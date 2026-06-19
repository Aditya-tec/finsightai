"""Insert Nifty 20 companies into Supabase companies table."""
import json
import sys
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

load_dotenv(ROOT / "backend" / ".env")

from settings import settings  # noqa: E402
from supabase import create_client  # noqa: E402

SECTORS = {
    "RELIANCE": "Energy",
    "TCS": "IT",
    "INFY": "IT",
    "HDFCBANK": "Banking",
    "ICICIBANK": "Banking",
    "WIPRO": "IT",
    "HCLTECH": "IT",
    "BAJFINANCE": "Financials",
    "KOTAKBANK": "Banking",
    "LT": "Industrials",
    "ASIANPAINT": "Consumer",
    "TITAN": "Consumer",
    "MARUTI": "Automobile",
    "TATAMOTORS": "Automobile",
    "SUNPHARMA": "Healthcare",
    "BHARTIARTL": "Telecom",
    "ITC": "Consumer",
    "AXISBANK": "Banking",
    "SBIN": "Banking",
    "NESTLEIND": "Consumer",
}


def main():
    client = create_client(settings.supabase_url, settings.supabase_key)
    companies = json.loads((ROOT / "scripts" / "nifty20_companies.json").read_text(encoding="utf-8"))

    rows = [
        {
            "ticker": c["ticker"],
            "name": c["name"],
            "sector": SECTORS.get(c["ticker"], "Unknown"),
        }
        for c in companies
    ]

    existing = client.table("companies").select("ticker").execute().data or []
    existing_tickers = {r["ticker"] for r in existing}
    to_insert = [r for r in rows if r["ticker"] not in existing_tickers]

    if to_insert:
        client.table("companies").insert(to_insert).execute()
        print(f"Inserted {len(to_insert)} companies")
    else:
        print("Companies already seeded")

    count = client.table("companies").select("id", count="exact").execute()
    print(f"Total companies in DB: {count.count}")


if __name__ == "__main__":
    main()
