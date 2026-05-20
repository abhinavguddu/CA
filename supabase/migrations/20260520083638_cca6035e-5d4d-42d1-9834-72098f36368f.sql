
-- Lock down SECURITY DEFINER/exposed functions
revoke execute on function public.has_role(uuid, public.app_role) from anon, authenticated, public;
revoke execute on function public.match_knowledge(vector, int, uuid) from anon, public;
-- authenticated may call match for RAG search
grant execute on function public.match_knowledge(vector, int, uuid) to authenticated;
revoke execute on function public.handle_new_user() from anon, authenticated, public;

-- Re-affirm search_path on match_knowledge
create or replace function public.match_knowledge(
  query_embedding vector(1536),
  match_count int default 5,
  filter_subject uuid default null
)
returns table (
  id uuid,
  source_title text,
  source_url text,
  content text,
  similarity float
)
language sql stable
set search_path = public
as $$
  select k.id, k.source_title, k.source_url, k.content,
    1 - (k.embedding <=> query_embedding) as similarity
  from public.knowledge_documents k
  where (filter_subject is null or k.subject_id = filter_subject)
    and k.embedding is not null
  order by k.embedding <=> query_embedding
  limit match_count;
$$;
revoke execute on function public.match_knowledge(vector, int, uuid) from anon, public;
grant execute on function public.match_knowledge(vector, int, uuid) to authenticated;
