create table if not exists public.mock_test_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  level text,
  total_questions int not null default 0,
  attempted int not null default 0,
  correct int not null default 0,
  score_pct numeric(5,2) not null default 0,
  time_taken_seconds int not null default 0,
  question_ids uuid[] not null default '{}',
  answers jsonb not null default '{}',
  completed_at timestamptz not null default now()
);

alter table public.mock_test_sessions enable row level security;

create policy "Users can manage own sessions"
  on public.mock_test_sessions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
