from __future__ import annotations

import json
import os

import networkx as nx

from settings import settings


def load_graph() -> nx.Graph:
    if not os.path.exists(settings.graph_path):
        return nx.Graph()
    with open(settings.graph_path, "r", encoding="utf-8") as f:
        graph_data = json.load(f)
    return nx.node_link_graph(graph_data)


def enrich_with_graph(chunks: list[dict], max_neighbors: int = 5) -> list[dict]:
    graph = load_graph()
    if graph.number_of_nodes() == 0:
        return chunks

    enriched = list(chunks)
    seen = {c.get("id") for c in chunks}
    for chunk in chunks:
        node_key = str(chunk.get("id"))
        if not graph.has_node(node_key):
            continue
        neighbors = list(graph.neighbors(node_key))[:max_neighbors]
        for neighbor in neighbors:
            data = graph.nodes[neighbor]
            candidate = {
                "id": neighbor,
                "content": data.get("content", ""),
                "ticker": data.get("ticker"),
                "doc_type": data.get("doc_type"),
                "section_title": data.get("section_title"),
                "retrieval_source": "graph",
            }
            if candidate["id"] not in seen:
                enriched.append(candidate)
                seen.add(candidate["id"])
    return enriched
