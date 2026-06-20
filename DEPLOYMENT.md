# Deployment Guide

## Secrets hygiene (before public demo)

1. **Rotate keys** in provider dashboards if this repo was ever public or keys may appear in git history:
   - Groq (`GROQ_API_KEY`)
   - Cohere (`COHERE_API_KEY`)
   - Supabase (`SUPABASE_URL`, `SUPABASE_KEY`)
2. Never commit `backend/.env` or `frontend/.env.local`.
3. Run the secret scan before pushing:
   ```bash
   python scripts/check_secrets.py
   ```

## Backend → Railway

1. Push project to GitHub.
2. In Railway, create project from GitHub repo.
3. Set root directory to `backend/`.
4. Add env vars from `backend/.env.example` (use rotated production keys):
   - `GROQ_API_KEY`, `COHERE_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`
   - `API_KEY` — shared secret for `/api/*` (generate a long random string)
   - Optional: `GROQ_REPORT_MODEL`, `HF_EMBEDDING_MODEL`, `BM25_INDEX_PATH`, `GRAPH_PATH`
5. Railway runs `backend/Procfile`:
   - `web: uvicorn main:app --host 0.0.0.0 --port $PORT`

## Frontend → Vercel

1. Import GitHub repo in Vercel.
2. Set root directory to `frontend/`.
3. Add env vars:
   - `NEXT_PUBLIC_API_URL=https://<your-railway-backend-url>`
   - `NEXT_PUBLIC_API_KEY=<same value as Railway API_KEY>`
4. Deploy.

## API key behavior

- When `API_KEY` is **unset** on the backend (local dev), middleware skips auth.
- When set on Railway, all `/api/*` routes require header `X-API-Key: <API_KEY>`.
- `GET /health` and `OPTIONS` are always public.
- The frontend sends the key via `NEXT_PUBLIC_API_KEY` (lightweight abuse guard, not strong security).

## End-to-end checklist

- [ ] `/health` returns 200 on Railway backend.
- [ ] `/api/companies` returns Nifty 20 list (with correct `X-API-Key` when enabled).
- [ ] Report generation works for one ticker.
- [ ] Follow-up chat includes prior report context.
- [ ] PDF export downloads from report page (Full + Bullet Summary).
- [ ] Backend stopped: home shows offline + clear error (not silent empty grid).
- [ ] Groq 429 on chat/report: friendly banner, no raw JSON.
- [ ] `curl` to `/api/report` without key → 401 when `API_KEY` is set.

## Mobile QA checklist

Test at **390px**, **430px**, and **768px** (browser devtools):

| Page | Check |
|------|-------|
| Home | Expanded company card — Ask / Report buttons stack and are tappable |
| Report | Section headers stack; Bullet Points toggle readable; TOC usable |
| Report TopBar | Regenerate / Export / ticker wrap without overflow |
| Chat | Form + answer panels stack cleanly; textarea usable |

## Cache refresh

After prompt or cache version changes, re-run `scripts/warm_reports.py` and commit updated JSON under `backend/data/report_cache/` before redeploying.
