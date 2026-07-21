-- Compact lexical retrieval for Vanguard. This leaves the scraped table unchanged.
create or replace function public.search_bataan_properties(search_text text, match_count integer default 3)
returns table (id uuid, title text, price text, location text, bedrooms text, bathrooms text, floor_area text, source_url text, rank real)
language sql stable security invoker set search_path = public
as $$
  with query as (select websearch_to_tsquery('simple', trim(search_text)) as terms)
  select property.id, property.title, property.price, property.location, property.bedrooms, property.bathrooms, property.floor_area, property.source_url,
    ts_rank_cd(setweight(to_tsvector('simple', coalesce(property.title, '')), 'A') || setweight(to_tsvector('simple', coalesce(property.location, '')), 'B') || setweight(to_tsvector('simple', coalesce(property.source_url, '')), 'C'), query.terms)::real as rank
  from public.bataan_properties as property cross join query
  where query.terms <> ''::tsquery and (setweight(to_tsvector('simple', coalesce(property.title, '')), 'A') || setweight(to_tsvector('simple', coalesce(property.location, '')), 'B') || setweight(to_tsvector('simple', coalesce(property.source_url, '')), 'C')) @@ query.terms
  order by rank desc, property.scraped_at desc nulls last
  limit greatest(1, least(coalesce(match_count, 3), 3));
$$;
grant execute on function public.search_bataan_properties(text, integer) to anon, authenticated;
