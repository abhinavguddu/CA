-- User Activity Tracking (for Admin panel)
-- Logs user actions app-wide; admin-only read.
create table if not exists public.user_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity text not null,
  detail text,
  path text,
  created_at timestamptz not null default now()
);
alter table public.user_activity enable row level security;

-- Users can insert their own activity rows (client-side logging)
create policy "Users can log own activity" on public.user_activity
  for insert to authenticated
  with check (auth.uid() = user_id);

-- Admins can read all activity
create policy "Admins can read all activity" on public.user_activity
  for select to authenticated
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- Helper: RPC to log activity from the client (fires-and-forgets, safe RLS)
create or replace function public.log_activity(p_activity text, p_detail text default null, p_path text default null)
returns void language sql security definer set search_path = public as $$
  insert into public.user_activity (user_id, activity, detail, path)
  values (auth.uid(), p_activity, p_detail, p_path);
$$;
revoke execute on function public.log_activity(text, text, text) from anon;
grant execute on function public.log_activity(text, text, text) to authenticated;

-- Online presence: one row per user, updated by heartbeat
create table if not exists public.user_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_seen timestamptz not null default now(),
  path text,
  updated_at timestamptz not null default now()
);
alter table public.user_presence enable row level security;

-- Users update their own presence row
create policy "Users can update own presence" on public.user_presence
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Admins can read presence for everyone
create policy "Admins can read presence" on public.user_presence
  for select to authenticated
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- RPC: update current user's presence heartbeat
create or replace function public.heartbeat(p_path text default null)
returns void language sql security definer set search_path = public as $$
  insert into public.user_presence (user_id, last_seen, path)
  values (auth.uid(), now(), p_path)
  on conflict (user_id) do update set
    last_seen = excluded.last_seen,
    path = excluded.path,
    updated_at = now();
$$;
revoke execute on function public.heartbeat(text) from anon;
grant execute on function public.heartbeat(text) to authenticated;

-- Admin RPC: fetch live users with profile info
create or replace function public.admin_live_users(threshold_seconds int default 120)
returns table (
  user_id uuid,
  email text,
  display_name text,
  roles text[],
  last_seen timestamptz,
  path text
) language sql security definer set search_path = public as $$
  select
    p.user_id,
    u.email,
    pr.display_name,
    coalesce(array_agg(r.role), array[]::app_role[])::text[] as roles,
    p.last_seen,
    p.path
  from public.user_presence p
  join auth.users u on u.id = p.user_id
  left join public.profiles pr on pr.id = p.user_id
  left join public.user_roles r on r.user_id = p.user_id
  where p.last_seen > now() - make_interval(secs => threshold_seconds)
  group by p.user_id, u.email, pr.display_name, p.last_seen, p.path
  order by p.last_seen desc;
$$;
revoke execute on function public.admin_live_users(integer) from anon, public;
grant execute on function public.admin_live_users(integer) to authenticated;

-- Admin RPC: full user roster with aggregate stats
create or replace function public.admin_users()
returns table (
  user_id uuid,
  email text,
  display_name text,
  roles text[],
  created_at timestamptz,
  last_seen timestamptz,
  total_activity bigint,
  streak_days bigint
) language sql security definer set search_path = public as $$
  select
    u.id as user_id,
    u.email,
    pr.display_name,
    coalesce(array_agg(r.role), array[]::app_role[])::text[] as roles,
    u.created_at,
    pres.last_seen,
    (select count(*) from public.user_activity a where a.user_id = u.id)::bigint as total_activity,
    (select count(*) from public.study_streaks s where s.user_id = u.id)::bigint as streak_days
  from auth.users u
  left join public.profiles pr on pr.id = u.id
  left join public.user_roles r on r.user_id = u.id
  left join public.user_presence pres on pres.user_id = u.id
  group by u.id, u.email, pr.display_name, pres.last_seen
  order by u.created_at desc;
$$;
revoke execute on function public.admin_users() from anon, public;
grant execute on function public.admin_users() to authenticated;

-- Admin RPC: recent activity feed with user info
create or replace function public.admin_activity(limit_count int default 100)
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
  order by a.created_at desc
  limit limit_count;
$$;
revoke execute on function public.admin_activity(integer) from anon, public;
grant execute on function public.admin_activity(integer) to authenticated;

-- RPC: current user's roles (security definer so RLS never blocks it)
create or replace function public.get_my_roles()
returns text[] language sql security definer set search_path = public as $$
  select coalesce(array_agg(role)::text[], array[]::text[])
  from public.user_roles
  where user_id = auth.uid();
$$;
revoke execute on function public.get_my_roles() from anon, public;
grant execute on function public.get_my_roles() to authenticated;

