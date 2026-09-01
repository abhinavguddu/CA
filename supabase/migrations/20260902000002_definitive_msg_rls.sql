-- ============================================================
-- DEFINITIVE FIX for admin_messages RLS (run the whole block)
-- Drops + recreates every policy so it works no matter what
-- partial state your DB is in. Safe to run multiple times.
-- ============================================================

alter table public.admin_messages enable row level security;

drop policy if exists "Admins can insert messages" on public.admin_messages;
drop policy if exists "Recipient can read own messages" on public.admin_messages;
drop policy if exists "Admins can read own sent messages" on public.admin_messages;

create policy "Admins can insert messages" on public.admin_messages
  for insert to authenticated
  with check (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );

create policy "Recipient can read own messages" on public.admin_messages
  for select to authenticated
  using (auth.uid() = recipient_id);

create policy "Admins can read own sent messages" on public.admin_messages
  for select to authenticated
  using (
    auth.uid() = sender_id
    or exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );

-- Also make sure admin_messages is in the realtime publication
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'admin_messages'
  ) then
    alter publication supabase_realtime add table public.admin_messages;
  end if;
end
$$;

-- ============================================================
-- Student-facing RPC that returns ONLY the current user's messages.
-- security definer = bypasses table RLS entirely, so the client poll
-- works even if policies are misconfigured. Each user still only ever
-- sees their OWN messages because we filter by auth.uid().
-- ============================================================
create or replace function public.my_messages(p_limit int default 10)
returns table (id uuid, sender_email text, message text, created_at timestamptz)
language sql security definer set search_path = public as $$
  select m.id, u.email as sender_email, m.message, m.created_at
  from public.admin_messages m
  left join auth.users u on u.id = m.sender_id
  where m.recipient_id = auth.uid()
  order by m.created_at desc
  limit p_limit;
$$;
revoke execute on function public.my_messages(integer) from anon, public;
grant execute on function public.my_messages(integer) to authenticated;


-- ============================================================
-- VERIFICATION: run the two queries BELOW the block and send me
-- the FULL output so I know it actually applied in YOUR project.
-- ============================================================
select count(*) as policy_count from pg_policies
where schemaname = 'public' and tablename = 'admin_messages';

select count(*) as msg_count from admin_messages;
