-- Allow authenticated users to update and delete their own viewing requests
drop policy if exists "Users can update their own viewing requests" on public.viewing_requests;
create policy "Users can update their own viewing requests"
  on public.viewing_requests
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own viewing requests" on public.viewing_requests;
create policy "Users can delete their own viewing requests"
  on public.viewing_requests
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant update, delete on public.viewing_requests to authenticated;
