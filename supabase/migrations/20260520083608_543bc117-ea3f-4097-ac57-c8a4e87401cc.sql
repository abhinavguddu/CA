
-- Extensions
create extension if not exists vector;

-- Enum: app role
create type public.app_role as enum ('student', 'teacher', 'admin');
create type public.ca_level as enum ('Foundation', 'Intermediate', 'Final');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  level public.ca_level default 'Foundation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "Profiles are viewable by owner" on public.profiles
  for select to authenticated using (auth.uid() = id);
create policy "Users can insert their own profile" on public.profiles
  for insert to authenticated with check (auth.uid() = id);
create policy "Users can update their own profile" on public.profiles
  for update to authenticated using (auth.uid() = id);

-- User roles (separate table - security best practice)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

create policy "Users can view their own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id);
create policy "Admins can manage roles" on public.user_roles
  for all to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile + student role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  insert into public.user_roles (user_id, role) values (new.id, 'student');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Subjects
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  level public.ca_level not null,
  name text not null,
  code text,
  description text,
  created_at timestamptz not null default now()
);
alter table public.subjects enable row level security;
create policy "Anyone authenticated can view subjects" on public.subjects
  for select to authenticated using (true);
create policy "Teachers manage subjects" on public.subjects
  for all to authenticated
  using (public.has_role(auth.uid(), 'teacher') or public.has_role(auth.uid(), 'admin'));

-- Topics
create table public.topics (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  title text not null,
  description text,
  order_index int not null default 0,
  estimated_hours int default 2,
  created_at timestamptz not null default now()
);
alter table public.topics enable row level security;
create policy "Anyone authenticated can view topics" on public.topics
  for select to authenticated using (true);
create policy "Teachers manage topics" on public.topics
  for all to authenticated
  using (public.has_role(auth.uid(), 'teacher') or public.has_role(auth.uid(), 'admin'));

-- User progress
create table public.user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  status text not null default 'not_started', -- not_started | in_progress | completed
  confidence int default 0, -- 0-100
  notes text,
  updated_at timestamptz not null default now(),
  unique (user_id, topic_id)
);
alter table public.user_progress enable row level security;
create policy "Users view their own progress" on public.user_progress
  for select to authenticated using (auth.uid() = user_id);
create policy "Users upsert their own progress" on public.user_progress
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Users update their own progress" on public.user_progress
  for update to authenticated using (auth.uid() = user_id);
create policy "Users delete their own progress" on public.user_progress
  for delete to authenticated using (auth.uid() = user_id);

-- Doubts (chat threads)
create table public.doubts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New Doubt',
  subject_id uuid references public.subjects(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.doubts enable row level security;
create policy "Users view own doubts" on public.doubts
  for select to authenticated using (auth.uid() = user_id);
create policy "Users insert own doubts" on public.doubts
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Users update own doubts" on public.doubts
  for update to authenticated using (auth.uid() = user_id);
create policy "Users delete own doubts" on public.doubts
  for delete to authenticated using (auth.uid() = user_id);

-- Doubt messages
create table public.doubt_messages (
  id uuid primary key default gen_random_uuid(),
  doubt_id uuid not null references public.doubts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null, -- user | assistant
  content text not null,
  citations jsonb default '[]'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.doubt_messages enable row level security;
create policy "Users view own messages" on public.doubt_messages
  for select to authenticated using (auth.uid() = user_id);
create policy "Users insert own messages" on public.doubt_messages
  for insert to authenticated with check (auth.uid() = user_id);

-- Knowledge documents (RAG chunks)
create table public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid references public.subjects(id) on delete set null,
  source_title text not null,
  source_url text,
  chunk_index int not null default 0,
  content text not null,
  embedding vector(1536),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.knowledge_documents enable row level security;
create policy "Authenticated can read knowledge" on public.knowledge_documents
  for select to authenticated using (true);
create policy "Teachers manage knowledge" on public.knowledge_documents
  for all to authenticated
  using (public.has_role(auth.uid(), 'teacher') or public.has_role(auth.uid(), 'admin'));

create index knowledge_documents_embedding_idx
  on public.knowledge_documents using hnsw (embedding vector_cosine_ops);

-- Match function for RAG
create or replace function public.match_knowledge(
  query_embedding vector(1536),
  match_count int default 5,
  filter_subject uuid default null
)
returns table (
  id uuid,
  source_title text,
  source_url text,
  content text,
  similarity float
)
language sql stable
as $$
  select k.id, k.source_title, k.source_url, k.content,
    1 - (k.embedding <=> query_embedding) as similarity
  from public.knowledge_documents k
  where (filter_subject is null or k.subject_id = filter_subject)
    and k.embedding is not null
  order by k.embedding <=> query_embedding
  limit match_count;
$$;

-- Storage bucket for PDFs
insert into storage.buckets (id, name, public) values ('ca-materials', 'ca-materials', false)
on conflict (id) do nothing;

create policy "Authenticated can read ca-materials"
  on storage.objects for select to authenticated
  using (bucket_id = 'ca-materials');

create policy "Teachers can upload ca-materials"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'ca-materials' and (public.has_role(auth.uid(), 'teacher') or public.has_role(auth.uid(), 'admin')));

create policy "Teachers can delete ca-materials"
  on storage.objects for delete to authenticated
  using (bucket_id = 'ca-materials' and (public.has_role(auth.uid(), 'teacher') or public.has_role(auth.uid(), 'admin')));
