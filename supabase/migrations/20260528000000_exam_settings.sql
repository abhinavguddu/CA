create table if not exists public.exam_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  exam_date date not null,
  updated_at timestamptz not null default now(),
  unique (user_id, label)
);

alter table public.exam_settings enable row level security;

create policy "Users manage own exam settings"
  on public.exam_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
