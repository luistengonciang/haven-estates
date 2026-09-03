create table if not exists public.saved_properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid not null references public.bataan_properties(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.saved_properties enable row level security;

create unique index if not exists saved_properties_user_property_idx
  on public.saved_properties (user_id, property_id);

create index if not exists saved_properties_user_id_idx
  on public.saved_properties (user_id, created_at desc);

drop policy if exists "Users can read their own saved properties" on public.saved_properties;
create policy "Users can read their own saved properties"
  on public.saved_properties
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can save properties" on public.saved_properties;
create policy "Users can save properties"
  on public.saved_properties
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can remove saved properties" on public.saved_properties;
create policy "Users can remove saved properties"
  on public.saved_properties
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, delete on public.saved_properties to authenticated;
