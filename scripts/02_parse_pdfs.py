import argparse
import json
from pathlib import Path

import fitz


def validate_page_extraction(page_text: str, page_num: int, doc_name: str, log_path: Path) -> bool:
    if len(page_text.split()) < 100:
        with log_path.open("a", encoding="utf-8") as f:
            f.write(
                f"WARN: {doc_name} page {page_num} - only "
                f"{len(page_text.split())} words extracted\n"
            )
        return False
    return True


def parse_pdf(path: Path, log_path: Path) -> list[dict]:
    doc = fitz.open(path)
    pages = []
    for i, page in enumerate(doc, start=1):
        text = page.get_text("text").strip()
        validate_page_extraction(text, i, path.name, log_path)
        pages.append({"page_number": i, "text": text})
    return pages


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="data/raw")
    parser.add_argument("--output", default="data/parsed")
    parser.add_argument("--log", default="backend/failed_extractions.log")
    args = parser.parse_args()

    input_dir = Path(args.input)
    output_dir = Path(args.output)
    log_path = Path(args.log)
    output_dir.mkdir(parents=True, exist_ok=True)
    log_path.parent.mkdir(parents=True, exist_ok=True)
    log_path.touch(exist_ok=True)

    pdfs = list(input_dir.rglob("*.pdf"))
    for pdf in pdfs:
        parsed = parse_pdf(pdf, log_path)
        rel = pdf.relative_to(input_dir)
        out_file = output_dir / rel.with_suffix(".json")
        out_file.parent.mkdir(parents=True, exist_ok=True)
        out_file.write_text(json.dumps(parsed, ensure_ascii=False), encoding="utf-8")
        print(f"Parsed {pdf} -> {out_file}")


if __name__ == "__main__":
    main()
