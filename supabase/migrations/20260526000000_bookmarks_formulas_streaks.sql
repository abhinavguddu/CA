-- Bookmarks
create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('question', 'topic')),
  ref_id uuid not null,
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, type, ref_id)
);
alter table public.bookmarks enable row level security;
create policy "Users manage own bookmarks" on public.bookmarks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Formula Sheets
create table if not exists public.formula_sheets (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid references public.subjects(id) on delete cascade,
  title text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.formula_sheets enable row level security;
create policy "Anyone authenticated can read formula sheets" on public.formula_sheets
  for select using (auth.role() = 'authenticated');
create policy "Teachers can manage formula sheets" on public.formula_sheets
  for all using (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role in ('teacher','admin'))
  );

-- Study Streaks
create table if not exists public.study_streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  minutes int not null default 1,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);
alter table public.study_streaks enable row level security;
create policy "Users manage own streaks" on public.study_streaks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
