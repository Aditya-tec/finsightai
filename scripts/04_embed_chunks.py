import argparse
import json
from pathlib import Path

from sentence_transformers import SentenceTransformer


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="data/chunks/chunks.jsonl")
    parser.add_argument("--output", default="data/chunks/chunks_with_embeddings.jsonl")
    parser.add_argument("--model", default="sentence-transformers/all-MiniLM-L6-v2")
    args = parser.parse_args()

    model = SentenceTransformer(args.model)
    input_path = Path(args.input)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with input_path.open("r", encoding="utf-8") as reader, output_path.open(
        "w", encoding="utf-8"
    ) as writer:
        for line in reader:
            row = json.loads(line)
            embedding = model.encode(row["content"], normalize_embeddings=True).tolist()
            row["embedding"] = embedding
            writer.write(json.dumps(row, ensure_ascii=False) + "\n")
    print(f"Embedded chunks written to {output_path}")


if __name__ == "__main__":
    main()
