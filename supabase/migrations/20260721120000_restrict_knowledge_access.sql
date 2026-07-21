-- Knowledge source text is available only to signed-in Haven users.
drop policy if exists "Knowledge documents are publicly readable" on public.knowledge_documents;

create policy "Authenticated users can read knowledge documents"
  on public.knowledge_documents
  for select
  to authenticated
  using (true);

revoke select on public.knowledge_documents from anon;
grant select on public.knowledge_documents to authenticated;

-- `match_knowledge_documents` uses cosine distance (`<=>`), so the index must
-- use the matching cosine operator class.
create index if not exists knowledge_documents_embedding_hnsw_idx
  on public.knowledge_documents
  using hnsw (embedding extensions.vector_cosine_ops);

revoke execute on function public.match_knowledge_documents(extensions.vector, float, int) from anon;
revoke execute on function public.match_knowledge_documents(extensions.vector, float, int) from public;
grant execute on function public.match_knowledge_documents(extensions.vector, float, int) to authenticated;
