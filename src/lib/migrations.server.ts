import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const setupTables = createServerFn({ method: "POST" }).handler(async () => {
  const sqls = [
    `create table if not exists public.mock_test_sessions (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references auth.users(id) on delete cascade,
      subject_id uuid references public.subjects(id) on delete set null,
      level text, total_questions int not null default 0,
      attempted int not null default 0, correct int not null default 0,
      score_pct numeric(5,2) not null default 0,
      time_taken_seconds int not null default 0,
      question_ids uuid[] not null default '{}',
      answers jsonb not null default '{}',
      completed_at timestamptz not null default now()
    )`,
    `alter table if exists public.mock_test_sessions enable row level security`,
    `create table if not exists public.bookmarks (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references auth.users(id) on delete cascade,
      type text not null check (type in ('question','topic')),
      ref_id uuid not null, note text,
      created_at timestamptz not null default now(),
      unique (user_id, type, ref_id)
    )`,
    `alter table if exists public.bookmarks enable row level security`,
    `create table if not exists public.formula_sheets (
      id uuid primary key default gen_random_uuid(),
      subject_id uuid references public.subjects(id) on delete cascade,
      title text not null, content text not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )`,
    `alter table if exists public.formula_sheets enable row level security`,
    `create table if not exists public.study_streaks (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references auth.users(id) on delete cascade,
      date date not null, minutes int not null default 1,
      created_at timestamptz not null default now(),
      unique (user_id, date)
    )`,
    `alter table if exists public.study_streaks enable row level security`,
    `create table if not exists public.exam_settings (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references auth.users(id) on delete cascade,
      label text not null, exam_date date not null,
      updated_at timestamptz not null default now(),
      unique (user_id, label)
    )`,
    `alter table if exists public.exam_settings enable row level security`,
    `create table if not exists public.flashcards (
      id uuid primary key default gen_random_uuid(),
      subject_id uuid references public.subjects(id) on delete set null,
      front text not null, back text not null,
      created_by uuid references auth.users(id) on delete set null,
      created_at timestamptz not null default now()
    )`,
    `alter table if exists public.flashcards enable row level security`,
    `create table if not exists public.study_sessions (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references auth.users(id) on delete cascade,
      topic_id uuid references public.topics(id) on delete set null,
      subject_id uuid references public.subjects(id) on delete cascade,
      duration_seconds int not null,
      created_at timestamptz not null default now()
    )`,
    `alter table if exists public.study_sessions enable row level security`,
    `do $$
    begin
      if not exists (
        select 1 from pg_policies where policyname = 'Users can manage own study sessions' and tablename = 'study_sessions'
      ) then
        create policy "Users can manage own study sessions" on public.study_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
      end if;
    end
    $$;`,
  ];

  const results: { sql: string; error: string | null }[] = [];
  for (const sql of sqls) {
    const { error } = await supabaseAdmin.from("_migrations_dummy" as any).select().limit(0);
    // Use raw postgres via supabaseAdmin
    const res = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        },
        body: JSON.stringify({ sql }),
      }
    );
    results.push({ sql: sql.slice(0, 50), error: res.ok ? null : await res.text() });
  }
  return results;
});
