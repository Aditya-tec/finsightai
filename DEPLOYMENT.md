# Deployment Guide

## Backend -> Railway

1. Push project to GitHub.
2. In Railway, create project from GitHub repo.
3. Set root directory to `backend/`.
4. Add env vars from `backend/.env`.
5. Railway runs `backend/Procfile`:
   - `web: uvicorn main:app --host 0.0.0.0 --port $PORT`

## Frontend -> Vercel

1. Import GitHub repo in Vercel.
2. Set root directory to `frontend/`.
3. Add env var:
   - `NEXT_PUBLIC_API_URL=https://<your-railway-backend-url>`
4. Deploy.

## End-to-End Checklist

- `/health` returns 200 on Railway backend.
- `/api/companies` returns Nifty 20 list.
- Report generation works for one ticker.
- Follow-up chat includes prior report context.
- PDF export downloads from report page.
