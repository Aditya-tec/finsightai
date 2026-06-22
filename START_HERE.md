# START HERE — Do These Steps In Order

You do not need to understand the code. Just follow each step.

---

## STEP 1 — Get API keys (30 minutes)

### A) Groq (LLM — free)
1. Open https://console.groq.com/
2. Sign up / log in
3. Go to **API Keys** → **Create API Key**
4. Copy the key (starts with `gsk_...`)
5. Paste into `backend/.env`:
   ```
   GROQ_API_KEY=gsk_your_key_here
   ```

### B) Supabase (database — free)
1. Open https://supabase.com/
2. **New Project** → pick any name, set a DB password (save it)
3. Wait ~2 min for project to finish creating
4. Go to **Project Settings** → **API**
5. Copy:
   - **Project URL** → `SUPABASE_URL` in `backend/.env`
   - **anon public** key → `SUPABASE_KEY` in `backend/.env`
6. Go to **SQL Editor** → **New query**
7. Open file `backend/supabase_schema.sql` in this project, copy ALL of it, paste into Supabase SQL editor, click **Run**

### C) Cohere (reranker — free tier)
1. Open https://dashboard.cohere.com/
2. Sign up → **API Keys** → create key
3. Paste into `backend/.env`:
   ```
   COHERE_API_KEY=your_key_here
   ```

### D) Hugging Face (embeddings — free, optional account)
- Embeddings run locally; no key required for basic use.
- Account at https://huggingface.co/ is optional unless you hit rate limits.

---

## STEP 2 — Run the app locally

Open **two** PowerShell windows.

**Window 1 — Backend:**
```powershell
cd C:\Users\kalam\Desktop\FinSight-AI\backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload --port 8000
```
Leave this running. Test: open http://localhost:8000/health — should show `{"status":"ok"}`.

**Window 2 — Frontend:**
```powershell
cd C:\Users\kalam\Desktop\FinSight-AI\frontend
npm run dev
```
Open http://localhost:3000 in your browser.

---

## STEP 3 — Load data (after keys work)

**PDFs:** Either add direct `pdf_url` values to `scripts/bse_report_urls.json` and run step 01, **or** drop files manually as `data/raw/{TICKER}_FY25.pdf` (e.g. `data/raw/INFY_FY25.pdf`).

From project root (third terminal or after stopping nothing):

```powershell
cd C:\Users\kalam\Desktop\FinSight-AI
.\backend\venv\Scripts\python.exe scripts\01_download_pdfs.py
.\backend\venv\Scripts\python.exe scripts\02_parse_pdfs.py
.\backend\venv\Scripts\python.exe scripts\03_chunk_documents.py
.\backend\venv\Scripts\python.exe scripts\04_embed_chunks.py
.\backend\venv\Scripts\python.exe scripts\05_store_supabase.py --supabase-url "YOUR_SUPABASE_URL" --supabase-key "YOUR_SUPABASE_KEY"
.\backend\venv\Scripts\python.exe scripts\06_build_bm25_index.py
.\backend\venv\Scripts\python.exe scripts\07_build_graph.py
```

> **Note:** Step `01_download_pdfs.py` reads URLs from `scripts/bse_report_urls.json`. Empty URLs are skipped — manual PDF drops at `data/raw/{TICKER}_FY25.pdf` work fine; run from step 02.

---

## STEP 4 — Try the demo

1. http://localhost:3000 → pick a company (e.g. INFY)
2. **Ask a Question** → watch Agent Thinking panel
3. **Generate Full Report** → then use follow-up chat at bottom
4. Click **Export PDF**

---

## STEP 5 — Deploy (when local works)

See `DEPLOYMENT.md` for Railway (backend) + Vercel (frontend).

---

## If something breaks

| Problem | Fix |
|--------|-----|
| Backend won't start | Run `pip install -r requirements.txt` inside `backend` venv |
| Frontend can't reach API | Check `frontend/.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:8000` |
| Empty answers | Add Groq key; run ingestion pipeline |
| No companies on home page | Start backend first, refresh frontend |

When you have your Groq + Supabase keys pasted, tell me **"keys are in"** and I will run the ingestion and verify everything with you.
