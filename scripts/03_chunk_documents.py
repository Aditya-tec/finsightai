import argparse
import json
from pathlib import Path

TICKER_ALIASES = {"TATAMOTERS": "TATAMOTORS"}

SECTION_MARKERS = [
    "management discussion",
    "risk factors",
    "financial statements",
    "notes",
]


def split_sections(text: str) -> list[tuple[str, str]]:
    lines = text.splitlines()
    sections = []
    title = "general"
    bucket = []
    for line in lines:
        normalized = line.strip().lower()
        if any(marker in normalized for marker in SECTION_MARKERS):
            if bucket:
                sections.append((title, "\n".join(bucket)))
            title = line.strip() or "general"
            bucket = []
        else:
            bucket.append(line)
    if bucket:
        sections.append((title, "\n".join(bucket)))
    return sections or [("general", text)]


def chunk_text(text: str, size: int = 512, overlap: int = 50) -> list[str]:
    tokens = text.split()
    chunks = []
    start = 0
    while start < len(tokens):
        end = min(start + size, len(tokens))
        chunks.append(" ".join(tokens[start:end]))
        if end == len(tokens):
            break
        start = max(0, end - overlap)
    return chunks


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="data/parsed")
    parser.add_argument("--output", default="data/chunks/chunks.jsonl")
    args = parser.parse_args()

    input_dir = Path(args.input)
    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    with out_path.open("w", encoding="utf-8") as writer:
        for parsed_file in input_dir.rglob("*.json"):
            pages = json.loads(parsed_file.read_text(encoding="utf-8"))
            parent = parsed_file.parts[-2] if len(parsed_file.parts) > 1 else "UNKNOWN"
            stem = parsed_file.stem
            ticker = parent if parent not in {"parsed", "chunks", "data"} else stem.split("_")[0]
            ticker = TICKER_ALIASES.get(ticker, ticker)
            fiscal_year = stem.split("_")[1] if "_" in stem else None
            chunk_index = 0
            for page in pages:
                for title, section in split_sections(page.get("text", "")):
                    for chunk in chunk_text(section):
                        row = {
                            "ticker": ticker,
                            "content": chunk,
                            "chunk_index": chunk_index,
                            "page_number": page.get("page_number"),
                            "section_title": title,
                            "doc_type": "filing",
                            "fiscal_year": fiscal_year,
                            "quarter": None,
                            "metadata": {"source_file": str(parsed_file)},
                        }
                        writer.write(json.dumps(row, ensure_ascii=False) + "\n")
                        chunk_index += 1
            print(f"Chunked {parsed_file}")


if __name__ == "__main__":
    main()
