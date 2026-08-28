---
title: RupeeRead Backend
emoji: 📊
colorFrom: green
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# RupeeRead API

FastAPI backend for [RupeeRead](https://finsightai-tau.vercel.app) — Indian market analyst with agentic RAG, report generation, and citations.

- `GET /health` — health check
- `GET /api/companies` — Nifty 20 list
- `POST /api/chat` — filing-grounded Q&A
- `POST /api/report` — 11-section equity report

Set secrets in **Settings → Variables and secrets**: `GROQ_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`, `COHERE_API_KEY`, `API_KEY`.
