"""Create sample PDF filings for 3 tickers so ingestion can run before real BSE downloads."""
from pathlib import Path

import fitz

SAMPLES = {
    "INFY": {
        "name": "Infosys Limited",
        "pages": [
            (
                "Management Discussion and Analysis FY25",
                "Infosys reported consolidated revenue of INR 162,990 crore for fiscal year 2025, "
                "representing year-on-year growth of approximately 4.2 percent in constant currency. "
                "Operating margin for FY25 stood at 21.1 percent. Digital revenue contributed over "
                "62 percent of total revenue. Large deal TCV for FY25 was USD 11.6 billion. "
                "The company continued investing in generative AI capabilities across consulting, "
                "cloud, and application services. Client metrics remained stable with focus on cost "
                "optimization and vendor consolidation among global enterprises. "
                "Geographic mix remained diversified across North America, Europe, and Rest of World."
            ),
            (
                "Financial Statements FY25",
                "Profit after tax for FY25 was INR 26,233 crore compared to INR 25,000 crore in FY24. "
                "Basic EPS was INR 63.2. Return on equity was approximately 29 percent. "
                "Free cash flow generation remained strong at INR 24,000 crore. "
                "Cash and investments stood at INR 39,000 crore. "
                "The board recommended a final dividend for FY25. "
                "Employee count at year end was approximately 320,000 including subsidiaries."
            ),
            (
                "Q4 FY26 Results Highlights",
                "For Q4 FY26, Infosys reported revenue of INR 41,000 crore with sequential growth. "
                "Management commentary highlighted improved discretionary spending in BFSI and retail. "
                "Attrition declined quarter on quarter. Utilization improved to 84 percent. "
                "Guidance for FY27 revenue growth was provided in constant currency terms."
            ),
        ],
    },
    "TCS": {
        "name": "Tata Consultancy Services",
        "pages": [
            (
                "Management Discussion FY25",
                "TCS reported revenue of INR 240,000 crore in FY25 with operating margin of 24.5 percent. "
                "North America remained the largest geography. BFSI and consumer business verticals "
                "showed resilient demand. The company signed multiple large transformation deals. "
                "Investment in AI and cloud modernization continued across the client base."
            ),
            (
                "Financial Performance FY25",
                "Net profit for FY25 was INR 46,000 crore. ROE exceeded 50 percent. "
                "Free cash flow was INR 42,000 crore. Dividend payout remained consistent with policy. "
                "Employee strength crossed 600,000. Deal pipeline remained healthy entering FY26."
            ),
        ],
    },
    "RELIANCE": {
        "name": "Reliance Industries Limited",
        "pages": [
            (
                "Business Overview FY25",
                "Reliance Industries consolidated revenue exceeded INR 900,000 crore in FY25. "
                "Oil to chemicals segment benefited from improved refining margins. "
                "Jio Platforms continued subscriber and ARPU growth. Retail segment expanded store footprint. "
                "New energy initiatives progressed on giga factories and renewable capacity."
            ),
            (
                "Financial Highlights FY25",
                "EBITDA grew year on year driven by digital services and retail. "
                "Net debt metrics improved after capex cycle moderation. "
                "Capital expenditure was directed toward 5G rollout, retail expansion, and new energy."
            ),
        ],
    },
}


def write_pdf(ticker: str, pages: list[tuple[str, str]], out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    doc = fitz.open()
    for title, body in pages:
        page = doc.new_page()
        text = f"{title}\n\n{body}"
        page.insert_text((72, 72), text, fontsize=11)
    target = out_dir / f"{ticker}_FY25_sample.pdf"
    doc.save(target)
    doc.close()
    print(f"Created {target}")


def main():
    root = Path(__file__).resolve().parents[1]
    raw = root / "data" / "raw"
    for ticker, meta in SAMPLES.items():
        write_pdf(ticker, meta["pages"], raw / ticker)


if __name__ == "__main__":
    main()
