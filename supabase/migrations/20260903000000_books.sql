-- Book library: a readable collection of CA PDF books per level
-- Supports both uploaded files (in storage) and external URLs.

-- Books table
create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text,
  level text not null check (level in ('Foundation', 'Intermediate', 'Final')),
  subject_id uuid references public.subjects(id) on delete set null,
  description text,
  file_path text,          -- storage path (uploaded books) OR null when using external_url
  external_url text,       -- direct PDF URL (e.g. CDN) OR null when uploaded
  file_size int,
  page_count int,
  cover_path text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.books enable row level security;

-- Everyone (logged in) can read the book list
create policy "Authenticated can read books" on public.books
  for select to authenticated
  using (true);

-- Admins / teachers can add and edit books
create or replace function public.can_manage_content()
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role in ('admin', 'teacher')
  );
$$;
revoke execute on function public.can_manage_content() from anon, public;
grant execute on function public.can_manage_content() to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='books' and policyname='Admins can insert books') then
    create policy "Admins can insert books" on public.books
      for insert to authenticated
      with check (public.can_manage_content());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='books' and policyname='Admins can update books') then
    create policy "Admins can update books" on public.books
      for update to authenticated
      using (public.can_manage_content());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='books' and policyname='Admins can delete books') then
    create policy "Admins can delete books" on public.books
      for delete to authenticated
      using (public.can_manage_content());
  end if;
end
$$;

-- Make sure the storage bucket exists and is public so PDFs render in the browser
insert into storage.buckets (id, name, public, file_size_limit)
values ('ca-materials', 'ca-materials', true, 104857600)
on conflict (id) do update set public = true, file_size_limit = 104857600;

-- Authenticated users can read files in the bucket (public already but keep read grant)
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Authenticated read ca-materials') then
    create policy "Authenticated read ca-materials" on storage.objects
      for select to authenticated
      using (bucket_id = 'ca-materials');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Admins upload ca-materials') then
    create policy "Admins upload ca-materials" on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'ca-materials' and public.can_manage_content()
      );
  end if;
end
$$;
