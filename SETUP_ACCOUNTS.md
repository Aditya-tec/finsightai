# FinSight AI Account and Key Setup

Complete these steps before running the app end-to-end.

## 1) Create free accounts

- Groq: https://console.groq.com/
- Supabase: https://supabase.com/
- Cohere: https://dashboard.cohere.com/
- Railway: https://railway.app/
- Vercel: https://vercel.com/
- GitHub: https://github.com/
- Hugging Face: https://huggingface.co/

## 2) Collect keys and URLs

Keep these values ready:

- `GROQ_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `COHERE_API_KEY`
- `NEXT_PUBLIC_API_URL` (local: `http://localhost:8000`)

## 3) Fill environment files

- Copy `backend/.env.example` to `backend/.env`
- Copy `frontend/.env.local.example` to `frontend/.env.local`
- Paste your real values

## 4) Deployment values

When deploying:

- Railway gets backend `.env` values
- Vercel gets frontend `NEXT_PUBLIC_API_URL` pointed to Railway backend URL
