-- Listings carry their own photos and blurb so the grid can stop falling back to
-- five stock images keyed off the property type.
alter table public.bataan_properties
  add column if not exists image_urls text[],
  add column if not exists description text;

-- Browsing is public; only saving, chat, and viewing requests require an account.
-- Enabling RLS with an explicit read policy keeps anonymous reads working while
-- closing off writes (the scraper uses the service role and bypasses RLS).
alter table public.bataan_properties enable row level security;

drop policy if exists "Bataan listings are publicly readable" on public.bataan_properties;
create policy "Bataan listings are publicly readable"
  on public.bataan_properties
  for select
  to anon, authenticated
  using (true);
