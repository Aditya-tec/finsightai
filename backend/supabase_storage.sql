-- Supabase Storage for annual report PDFs and parsed page JSON.
-- Run in Supabase SQL Editor after enabling Storage in the dashboard.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'annual-filings',
  'annual-filings',
  false,
  52428800,
  array['application/pdf', 'application/json']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Service role (backend) bypasses RLS. Optional: allow authenticated read.
-- Private bucket — all access via backend using SUPABASE_KEY.
