create extension if not exists vector;

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  ticker text not null,
  name text not null,
  sector text,
  created_at timestamp default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id),
  ticker text not null,
  doc_type text not null,
  fiscal_year text,
  quarter text,
  file_name text,
  page_count int,
  created_at timestamp default now()
);

create table if not exists chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id),
  ticker text not null,
  content text not null,
  embedding vector(384),
  chunk_index int,
  page_number int,
  section_title text,
  doc_type text,
  fiscal_year text,
  quarter text,
  metadata jsonb,
  created_at timestamp default now()
);

create table if not exists reranker_cache (
  id uuid primary key default gen_random_uuid(),
  query_hash text not null unique,
  query_text text not null,
  ranked_chunk_ids jsonb not null,
  created_at timestamp default now()
);

create or replace function match_chunks(
  query_embedding vector(384),
  match_threshold float,
  match_count int,
  filter_ticker text default null
)
returns table (
  id uuid,
  content text,
  ticker text,
  doc_type text,
  fiscal_year text,
  page_number int,
  section_title text,
  similarity float
)
language sql
stable
as $$
  select c.id, c.content, c.ticker, c.doc_type, c.fiscal_year, c.page_number,
         c.section_title, 1 - (c.embedding <=> query_embedding) as similarity
  from chunks c
  where (filter_ticker is null or c.ticker = filter_ticker)
    and 1 - (c.embedding <=> query_embedding) > match_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
