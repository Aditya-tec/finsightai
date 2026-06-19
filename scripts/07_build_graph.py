import argparse
import json
import uuid
from pathlib import Path

import networkx as nx


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="data/chunks/chunks.jsonl")
    parser.add_argument("--output", default="backend/graph.json")
    args = parser.parse_args()

    graph = nx.Graph()
    input_path = Path(args.input)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    ticker_buckets: dict[str, list[str]] = {}
    with input_path.open("r", encoding="utf-8") as reader:
        for line in reader:
            row = json.loads(line)
            node_id = str(row.get("id") or uuid.uuid4())
            graph.add_node(
                node_id,
                content=row.get("content", ""),
                ticker=row.get("ticker"),
                doc_type=row.get("doc_type"),
                section_title=row.get("section_title"),
            )
            ticker = row.get("ticker") or "UNKNOWN"
            ticker_buckets.setdefault(ticker, []).append(node_id)

    for _, nodes in ticker_buckets.items():
        for i in range(0, max(len(nodes) - 1, 0)):
            graph.add_edge(nodes[i], nodes[i + 1], relation="same_ticker_sequence")

    graph_data = nx.node_link_data(graph)
    output_path.write_text(json.dumps(graph_data), encoding="utf-8")
    print(f"Saved graph with {graph.number_of_nodes()} nodes to {output_path}")


if __name__ == "__main__":
    main()
