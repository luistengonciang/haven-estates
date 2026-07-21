-- A legacy policy in the hosted project grants anonymous reads. Remove it so
-- the authenticated-only policy remains the sole knowledge access path.
drop policy if exists "Allow public read access" on public.knowledge_documents;
