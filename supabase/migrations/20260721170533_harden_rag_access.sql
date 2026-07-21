-- The legacy two-argument overload is not used by Vanguard and must not be
-- callable anonymously. The five-argument overload remains authenticated-only.
revoke execute on function public.search_bataan_properties(text, integer) from public, anon;
grant execute on function public.search_bataan_properties(text, integer) to authenticated;
