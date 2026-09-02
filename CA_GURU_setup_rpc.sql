-- CA Guru: one-time setup - create exec_sql RPC (10 lines)
-- Run this ONCE in the Supabase SQL editor. Safe to re-run.
create or replace function public.exec_sql(sql text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  execute sql;
  return '{"ok":true}'::json;
exception when others then
  return json_build_object('error', sqlerrm);
end;
$$;

revoke execute on function public.exec_sql(text) from public, anon, authenticated;
grant execute on function public.exec_sql(text) to service_role, postgres;