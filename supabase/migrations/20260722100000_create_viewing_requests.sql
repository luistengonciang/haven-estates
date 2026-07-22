create table if not exists public.viewing_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid not null,
  preferred_date date not null,
  preferred_time text check (preferred_time is null or char_length(preferred_time) <= 80),
  notes text check (notes is null or char_length(notes) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.viewing_requests enable row level security;

create index if not exists viewing_requests_user_id_idx
  on public.viewing_requests (user_id, created_at desc);

create unique index if not exists viewing_requests_pending_unique_idx
  on public.viewing_requests (user_id, property_id, preferred_date)
  where status = 'pending';

drop policy if exists "Users can read their own viewing requests" on public.viewing_requests;
create policy "Users can read their own viewing requests"
  on public.viewing_requests
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own viewing requests" on public.viewing_requests;
create policy "Users can create their own viewing requests"
  on public.viewing_requests
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

grant select, insert on public.viewing_requests to authenticated;
