"""Verify Supabase vector search and chat pipeline."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from rag.embedder import embed_text
from rag.hybrid_search import hybrid_retrieve
from settings import settings
from supabase import create_client


def main():
    client = create_client(settings.supabase_url, settings.supabase_key)
    chunks = client.table("chunks").select("id", count="exact").execute()
    print(f"Chunks in Supabase: {chunks.count}")

    query = "What was Infosys FY25 revenue?"
    embedding = embed_text(query)
    matches = client.rpc(
        "match_chunks",
        {
            "query_embedding": embedding,
            "match_threshold": 0.1,
            "match_count": 5,
            "filter_ticker": "INFY",
        },
    ).execute()
    print(f"Vector matches for INFY: {len(matches.data or [])}")
    if matches.data:
        print(f"Top match preview: {matches.data[0]['content'][:120]}...")

    hybrid = hybrid_retrieve(query, ticker="INFY", limit=5)
    print(f"Hybrid retrieval results: {len(hybrid)}")
    print("Verification complete.")


if __name__ == "__main__":
    main()
