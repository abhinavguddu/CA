import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { SEED_CH1 } from "./seed_ch1";
import { SEED_CH2 } from "./seed_ch2";
import { SEED_CH3 } from "./seed_ch3";
import { SEED_CH4 } from "./seed_ch4";
import { SEED_CH5 } from "./seed_ch5";
import { SEED_CH6 } from "./seed_ch6";
import { SEED_CH7 } from "./seed_ch7";
import { SEED_CH8 } from "./seed_ch8";
import { SEED_CH9 } from "./seed_ch9";
import { SEED_CH10 } from "./seed_ch10";
import { SEED_CH11 } from "./seed_ch11";
import { SEED_CH12 } from "./seed_ch12";
import { SEED_CH13 } from "./seed_ch13";
import { SEED_CH14 } from "./seed_ch14";

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
    `create table if not exists public.books (
      id uuid primary key default gen_random_uuid(),
      title text not null,
      author text,
      level text not null check (level in ('Foundation', 'Intermediate', 'Final')),
      subject_id uuid references public.subjects(id) on delete set null,
      description text,
      file_path text,
      external_url text,
      file_size int,
      page_count int,
      cover_path text,
      created_by uuid references auth.users(id) on delete set null,
      created_at timestamptz not null default now()
    )`,
    `alter table if exists public.books enable row level security`,
    `insert into storage.buckets (id, name, public, file_size_limit)
      values ('ca-materials', 'ca-materials', true, 104857600)
      on conflict (id) do update set public = true, file_size_limit = 104857600`,
    `do $$
    begin
      if not exists (select 1 from pg_policies where schemaname='public' and tablename='books' and policyname='Authenticated can read books') then
        create policy "Authenticated can read books" on public.books for select to authenticated using (true);
      end if;
      if not exists (select 1 from pg_policies where schemaname='public' and tablename='books' and policyname='Content admins can insert books') then
        create policy "Content admins can insert books" on public.books for insert to authenticated
          with check (exists (select 1 from public.user_roles where user_id = auth.uid() and role in ('admin','teacher')));
      end if;
      if not exists (select 1 from pg_policies where schemaname='public' and tablename='books' and policyname='Content admins can update books') then
        create policy "Content admins can update books" on public.books for update to authenticated
          using (exists (select 1 from public.user_roles where user_id = auth.uid() and role in ('admin','teacher')));
      end if;
      if not exists (select 1 from pg_policies where schemaname='public' and tablename='books' and policyname='Content admins can delete books') then
        create policy "Content admins can delete books" on public.books for delete to authenticated
          using (exists (select 1 from public.user_roles where user_id = auth.uid() and role in ('admin','teacher')));
      end if;
      if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Content admins upload ca-materials') then
        create policy "Content admins upload ca-materials" on storage.objects for insert to authenticated
          with check (bucket_id = 'ca-materials' and exists (select 1 from public.user_roles where user_id = auth.uid() and role in ('admin','teacher')));
      end if;
      if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Content admins delete ca-materials') then
        create policy "Content admins delete ca-materials" on storage.objects for delete to authenticated
          using (bucket_id = 'ca-materials' and exists (select 1 from public.user_roles where user_id = auth.uid() and role in ('admin','teacher')));
      end if;
    end
    $$;`,
    `insert into public.books (title, author, level, subject_id, external_url, description)
      select 'CA Inter Law MCQs by Darshan Khare', 'Darshan Khare', 'Intermediate',
        (select id from public.subjects where code = 'P2' and level = 'Intermediate' limit 1),
        'https://cdn.shopify.com/s/files/1/0023/3200/0311/files/CA_Inter_Law_MCQs_by_Darshan_Khare.pdf?15995338007595527142',
        'Chapter-wise Law MCQs for CA Intermediate preparation'
      where not exists (select 1 from public.books where title = 'CA Inter Law MCQs by Darshan Khare');`,
    `create table if not exists public.mcq_questions (
      id uuid primary key default gen_random_uuid(),
      book_id uuid references public.books(id) on delete cascade,
      chapter_no int not null default 1,
      chapter_title text,
      question_no int not null,
      question text not null,
      options jsonb not null default '[]'::jsonb,
      correct_index int,
      hint text,
      created_at timestamptz not null default now(),
      unique (book_id, chapter_no, question_no)
    )`,
    `alter table if exists public.mcq_questions enable row level security`,
    `do $$
    begin
      if not exists (select 1 from pg_policies where schemaname='public' and tablename='mcq_questions' and policyname='Authenticated can read mcq_questions') then
        create policy "Authenticated can read mcq_questions" on public.mcq_questions for select to authenticated using (true);
      end if;
      if not exists (select 1 from pg_policies where schemaname='public' and tablename='mcq_questions' and policyname='Content admins can insert mcq_questions') then
        create policy "Content admins can insert mcq_questions" on public.mcq_questions for insert to authenticated
          with check (exists (select 1 from public.user_roles where user_id = auth.uid() and role in ('admin','teacher')));
      end if;
      if not exists (select 1 from pg_policies where schemaname='public' and tablename='mcq_questions' and policyname='Content admins can update mcq_questions') then
        create policy "Content admins can update mcq_questions" on public.mcq_questions for update to authenticated
          using (exists (select 1 from public.user_roles where user_id = auth.uid() and role in ('admin','teacher')));
      end if;
      if not exists (select 1 from pg_policies where schemaname='public' and tablename='mcq_questions' and policyname='Content admins can delete mcq_questions') then
        create policy "Content admins can delete mcq_questions" on public.mcq_questions for delete to authenticated
          using (exists (select 1 from public.user_roles where user_id = auth.uid() and role in ('admin','teacher')));
      end if;
    end
    $$;`,
    `${SEED_CH1}`,
    `${SEED_CH2}`,
    `${SEED_CH3}`,
    `${SEED_CH4}`,
    `${SEED_CH5}`,
    `${SEED_CH6}`,
    `${SEED_CH7}`,
    `${SEED_CH8}`,
    `${SEED_CH9}`,
    `${SEED_CH10}`,
    `${SEED_CH11}`,
    `${SEED_CH12}`,
    `${SEED_CH13}`,
    `${SEED_CH14}`,
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
