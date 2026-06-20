# RupeeRead

Indian Market Analyst project with agentic RAG, citations, SSE reasoning stream, report generation, follow-up memory, and PDF export.

## Stack

- LLM: Groq (Llama 3.3 70B)
- Embeddings: `sentence-transformers/all-MiniLM-L6-v2`
- Vector DB: Supabase pgvector
- Keyword retrieval: BM25
- Reranker: Cohere with cache table
- Graph layer: NetworkX + `backend/graph.json`
- Backend: FastAPI
- Frontend: Next.js + Tailwind

## Project Structure

- `backend/` FastAPI app, RAG, agents, evaluation
- `frontend/` Next.js UI and report/chat flows
- `scripts/` ingestion pipeline scripts
- `data/` local data artifacts

## 1) Account and key setup

See `SETUP_ACCOUNTS.md`.

Create:

- `backend/.env` from `backend/.env.example`
- `frontend/.env.local` from `frontend/.env.local.example`

## 2) Backend setup

```bash
cd backend
python -m venv venv
# Windows PowerShell
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Health check:

- `http://localhost:8000/health`

## 3) Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Open:

- `http://localhost:3000`

## 4) Supabase schema

Run SQL from:

- `backend/supabase_schema.sql`

## 5) Ingestion pipeline

From project root:

```bash
python scripts/01_download_pdfs.py
python scripts/02_parse_pdfs.py
python scripts/03_chunk_documents.py
python scripts/04_embed_chunks.py
python scripts/05_store_supabase.py --supabase-url "<URL>" --supabase-key "<KEY>"
python scripts/06_build_bm25_index.py
python scripts/07_build_graph.py
```

## 6) Core APIs

- `POST /api/chat`
- `POST /api/report`
- `GET /api/stream`
- `GET /api/companies`

## 7) Deployment

### Railway (backend)

- Use `backend/` as root.
- Start command from `backend/Procfile`.
- Add backend env vars.

### Vercel (frontend)

- Use `frontend/` as root.
- Set `NEXT_PUBLIC_API_URL` to Railway backend URL.

## Notes

- Problem 7 follow-up memory is implemented via frontend report state + `conversation_history` in chat requests.
- Problem 6 auth/rate-limit is intentionally not added in this version.
