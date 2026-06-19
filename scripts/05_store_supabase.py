import argparse
import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / "backend" / ".env")

ALLOWED = {
    "document_id",
    "ticker",
    "content",
    "embedding",
    "chunk_index",
    "page_number",
    "section_title",
    "doc_type",
    "fiscal_year",
    "quarter",
    "metadata",
}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="data/chunks/chunks_with_embeddings.jsonl")
    parser.add_argument("--supabase-url", default=os.getenv("SUPABASE_URL", ""))
    parser.add_argument("--supabase-key", default=os.getenv("SUPABASE_KEY", ""))
    args = parser.parse_args()

    if not args.supabase_url or not args.supabase_key:
        print("Missing SUPABASE_URL or SUPABASE_KEY in backend/.env")
        sys.exit(1)

    client = create_client(args.supabase_url, args.supabase_key)
    input_path = ROOT / args.input

    batch = []
    with input_path.open("r", encoding="utf-8") as reader:
        for i, line in enumerate(reader, start=1):
            row = json.loads(line)
            row["document_id"] = None
            row = {k: v for k, v in row.items() if k in ALLOWED}
            batch.append(row)
            if len(batch) >= 100:
                client.table("chunks").insert(batch).execute()
                print(f"Uploaded batch ending at row {i}")
                batch = []

    if batch:
        client.table("chunks").insert(batch).execute()
        print("Uploaded final batch")


if __name__ == "__main__":
    main()
