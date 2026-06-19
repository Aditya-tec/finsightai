"""Check that required env vars are present (does not print secret values)."""
from settings import settings

checks = {
    "GROQ_API_KEY": bool(settings.groq_api_key),
    "SUPABASE_URL": bool(settings.supabase_url),
    "SUPABASE_KEY": bool(settings.supabase_key),
    "COHERE_API_KEY": bool(settings.cohere_api_key),
}

print("FinSight env check:")
for name, ok in checks.items():
    print(f"  {name}: {'OK' if ok else 'MISSING — add to backend/.env'}")

if all(checks.values()):
    print("\nAll keys set. Next: run Supabase SQL, then ingestion scripts.")
else:
    print("\nFollow START_HERE.md Step 1 to add missing keys.")
