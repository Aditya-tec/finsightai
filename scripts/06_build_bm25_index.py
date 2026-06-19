import argparse
import json
import pickle
from pathlib import Path


def tokenize(text: str) -> list[str]:
    return text.lower().split()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="data/chunks/chunks.jsonl")
    parser.add_argument("--output", default="backend/bm25_index.pkl")
    args = parser.parse_args()

    docs = []
    tokens = []
    input_path = Path(args.input)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with input_path.open("r", encoding="utf-8") as reader:
        for line in reader:
            row = json.loads(line)
            docs.append(row)
            tokens.append(tokenize(row["content"]))

    payload = {"docs": docs, "tokens": tokens}
    with output_path.open("wb") as f:
        pickle.dump(payload, f)
    print(f"Saved BM25 index to {output_path}")


if __name__ == "__main__":
    main()
