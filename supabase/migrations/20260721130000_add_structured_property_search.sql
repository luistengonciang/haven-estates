-- Add budget and property-type constraints to the listing search used by RAG.
create or replace function public.search_bataan_properties(
  search_text text,
  match_count integer default 3,
  max_price numeric default null,
  property_type text default null
)
returns table (
  id uuid,
  title text,
  price text,
  location text,
  bedrooms text,
  bathrooms text,
  floor_area text,
  source_url text,
  rank real
)
language sql stable security invoker set search_path = public
as $$
  with query as (
    select websearch_to_tsquery('simple', trim(search_text)) as terms
  ), candidates as (
    select
      property.*,
      setweight(to_tsvector('simple', coalesce(property.title, '')), 'A') ||
      setweight(to_tsvector('simple', coalesce(property.location, '')), 'B') ||
      setweight(to_tsvector('simple', coalesce(property.source_url, '')), 'C') as document,
      nullif(regexp_replace(coalesce(property.price, ''), '[^0-9.]', '', 'g'), '')::numeric as numeric_price
    from public.bataan_properties as property
  )
  select
    candidates.id,
    candidates.title,
    candidates.price,
    candidates.location,
    candidates.bedrooms,
    candidates.bathrooms,
    candidates.floor_area,
    candidates.source_url,
    ts_rank_cd(candidates.document, query.terms)::real as rank
  from candidates cross join query
  where query.terms <> ''::tsquery
    and candidates.document @@ query.terms
    and (max_price is null or (candidates.numeric_price is not null and candidates.numeric_price <= max_price))
    and (property_type is null or lower(concat_ws(' ', candidates.title, candidates.location, candidates.source_url)) ~ '(house|villa|townhouse|home)-?for-?sale|house|villa|townhouse|home')
  order by rank desc, candidates.scraped_at desc nulls last
  limit greatest(1, least(coalesce(match_count, 3), 10));
$$;

revoke execute on function public.search_bataan_properties(text, integer, numeric, text) from public, anon;
grant execute on function public.search_bataan_properties(text, integer, numeric, text) to authenticated;
