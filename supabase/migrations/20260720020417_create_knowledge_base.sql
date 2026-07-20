create extension if not exists vector with schema extensions;

create table if not exists public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  category text not null default 'real-estate',
  metadata jsonb not null default '{}'::jsonb,
  embedding extensions.vector(384),
  created_at timestamptz not null default now()
);

alter table public.knowledge_documents enable row level security;

drop policy if exists "Knowledge documents are publicly readable" on public.knowledge_documents;
create policy "Knowledge documents are publicly readable"
  on public.knowledge_documents
  for select
  to anon, authenticated
  using (true);

grant select on public.knowledge_documents to anon, authenticated;

create or replace function public.match_knowledge_documents(
  query_embedding extensions.vector(384),
  match_threshold float default 0.35,
  match_count int default 5
)
returns table (
  id uuid,
  title text,
  content text,
  category text,
  metadata jsonb,
  similarity float
)
language sql
stable
set search_path = public, extensions
as $$
  select
    documents.id,
    documents.title,
    documents.content,
    documents.category,
    documents.metadata,
    (1 - (documents.embedding <=> query_embedding))::float as similarity
  from public.knowledge_documents as documents
  where documents.embedding is not null
    and (1 - (documents.embedding <=> query_embedding)) >= match_threshold
  order by documents.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 20);
$$;

grant execute on function public.match_knowledge_documents(extensions.vector, float, int) to anon, authenticated;

insert into public.knowledge_documents (title, content, category, metadata)
select * from (values
  ('Pacific Heights buying brief', 'Pacific Heights is a premium San Francisco neighborhood with classic architecture, strong walkability, and limited inventory. Buyers should expect higher price per square foot and should evaluate seismic retrofits, HOA reserves, and block-by-block noise levels.', 'neighborhood', '{"place":"San Francisco, CA","price_band":"premium"}'::jsonb),
  ('Oakland budget strategy', 'Oakland offers a wider range of entry points than San Francisco, with meaningful variation between neighborhoods. Buyers should compare commute patterns, property taxes, insurance costs, renovation scope, and resale liquidity before setting a maximum budget.', 'neighborhood', '{"place":"Oakland, CA","price_band":"mid-market"}'::jsonb),
  ('Sausalito waterfront due diligence', 'Sausalito homes can command a premium for views and proximity to the water. Before making an offer, review flood exposure, drainage, insurance availability, retaining walls, and the condition of older hillside infrastructure.', 'neighborhood', '{"place":"Sausalito, CA","price_band":"luxury"}'::jsonb),
  ('Home purchase budget framework', 'A practical housing budget includes principal, interest, property taxes, homeowners insurance, HOA dues, maintenance, and a cash reserve. A lender pre-approval is useful, but buyers should also stress-test the payment against income changes and unexpected repairs.', 'finance', '{"topic":"PITI"}'::jsonb),
  ('Bay Area market evaluation', 'When evaluating a Bay Area investment, combine comparable sales with days on market, inventory, rent support, local employment, transit access, and planned development. Appreciation is never guaranteed, so an investment case should work under conservative assumptions.', 'market', '{"place":"Bay Area","topic":"investment"}'::jsonb),
  ('Offer preparation checklist', 'Before submitting an offer, confirm financing, inspect disclosures, review comparable sales, decide on inspection and appraisal contingencies, and define a walk-away price. Keep the decision tied to long-term livability rather than urgency or staging.', 'process', '{"topic":"offers"}'::jsonb)
) as seed(title, content, category, metadata)
where not exists (
  select 1 from public.knowledge_documents existing where existing.title = seed.title
);
