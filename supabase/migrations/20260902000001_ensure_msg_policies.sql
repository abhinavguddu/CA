-- Guarantee ALL admin_messages RLS policies exist (needed both for admin send/list
-- and for student delivery). Idempotent: safe to re-run.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'admin_messages' and policyname = 'Admins can insert messages') then
    create policy "Admins can insert messages" on public.admin_messages
      for insert to authenticated
      with check (
        exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'admin_messages' and policyname = 'Recipient can read own messages') then
    create policy "Recipient can read own messages" on public.admin_messages
      for select to authenticated
      using (auth.uid() = recipient_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'admin_messages' and policyname = 'Admins can read own sent messages') then
    create policy "Admins can read own sent messages" on public.admin_messages
      for select to authenticated
      using (
        auth.uid() = sender_id
        or exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
      );
  end if;
end
$$;

-- Verify: this must show ALL THREE policies
select policyname, cmd from pg_policies
where schemaname = 'public' and tablename = 'admin_messages'
order by policyname;

