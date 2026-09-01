-- Admin → Student live messages + per-user activity feed for the admin panel
-- Idempotent: runnable alongside the existing admin_activity migration.

-- Admin messages table (admin pushes a message, student's client hears it via Realtime)
create table if not exists public.admin_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.admin_messages enable row level security;

-- Policies guarded so the file is safe to re-run.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'admin_messages' and policyname = 'Admins can insert messages') then
    create policy "Admins can insert messages" on public.admin_messages
      for insert to authenticated
      with check (
        exists (
          select 1 from public.user_roles
          where user_id = auth.uid() and role = 'admin'
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'admin_messages' and policyname = 'Recipient can read own messages') then
    create policy "Recipient can read own messages" on public.admin_messages
      for select to authenticated
      using (auth.uid() = recipient_id);
  end if;

  -- Admins can read messages they sent (to list them in the panel)
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'admin_messages' and policyname = 'Admins can read own sent messages') then
    create policy "Admins can read own sent messages" on public.admin_messages
      for select to authenticated
      using (
        auth.uid() = sender_id
        or exists (
          select 1 from public.user_roles
          where user_id = auth.uid() and role = 'admin'
        )
      );
  end if;
end
$$;

-- RPC: admin sends a message to a student
create or replace function public.send_admin_message(p_recipient uuid, p_message text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_admin boolean;
  v_id uuid;
begin
  select exists(
    select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'
  ) into v_admin;
  if not v_admin then
    raise exception 'Admin access required';
  end if;
  insert into public.admin_messages (sender_id, recipient_id, message)
  values (auth.uid(), p_recipient, p_message)
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.send_admin_message(uuid, text) from anon, public;
grant execute on function public.send_admin_message(uuid, text) to authenticated;

-- Admin RPC: full activity log for one specific user (most recent first)
create or replace function public.admin_user_activity(p_user uuid, p_limit int default 500)
returns table (
  id uuid,
  user_id uuid,
  email text,
  display_name text,
  activity text,
  detail text,
  path text,
  created_at timestamptz
) language sql security definer set search_path = public as $$
  select
    a.id,
    a.user_id,
    u.email,
    pr.display_name,
    a.activity,
    a.detail,
    a.path,
    a.created_at
  from public.user_activity a
  join auth.users u on u.id = a.user_id
  left join public.profiles pr on pr.id = a.user_id
  where a.user_id = p_user
  order by a.created_at desc
  limit p_limit;
$$;
revoke execute on function public.admin_user_activity(uuid, integer) from anon, public;
grant execute on function public.admin_user_activity(uuid, integer) to authenticated;

-- Admin RPC: messages sent to a specific user
create or replace function public.admin_messages_for(p_user uuid, p_limit int default 100)
returns table (
  id uuid,
  sender_id uuid,
  sender_email text,
  message text,
  read_at timestamptz,
  created_at timestamptz
) language sql security definer set search_path = public as $$
  select
    m.id,
    m.sender_id,
    u.email as sender_email,
    m.message,
    m.read_at,
    m.created_at
  from public.admin_messages m
  join auth.users u on u.id = m.sender_id
  where m.recipient_id = p_user
  order by m.created_at desc
  limit p_limit;
$$;
revoke execute on function public.admin_messages_for(uuid, integer) from anon, public;
grant execute on function public.admin_messages_for(uuid, integer) to authenticated;

-- RPC: marks the current user's messages as read (student opens the toast)
create or replace function public.mark_messages_read(p_recipient uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.admin_messages
  set read_at = now()
  where recipient_id = p_recipient and read_at is null;
end;
$$;
revoke execute on function public.mark_messages_read(uuid) from anon, public;
grant execute on function public.mark_messages_read(uuid) to authenticated;

-- Enable postgres_changes realtime so clients are notified of inserts.
-- Guarded so re-running doesn't error ("table already a member of publication").
do $$
declare
  t text;
begin
  foreach t in array array['admin_messages', 'user_activity', 'user_presence']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end
$$;
