-- IronLog crew database
-- Paste this whole file into Supabase -> SQL Editor -> New query -> Run.
-- Safe to run more than once.
--
-- How access works (no logins needed):
--   * Every request from the app carries an "x-crew" header: a key derived from your crew code.
--     Rows are only visible to requests with the same crew key, so only people who know the
--     crew code can read your crew's data.
--   * Every phone also has its own random secret, sent as "x-member". Only the phone that
--     created a row can change or delete it.

-- Reads a request header sent by the app ('' when missing).
create or replace function public.req_header(h text) returns text
language sql stable
as $$
  select coalesce(nullif(current_setting('request.headers', true), '')::json ->> h, '')
$$;

-- SHA-256 of this phone's secret, or '' when no secret was sent.
create or replace function public.member_hash() returns text
language sql stable
as $$
  select case when public.req_header('x-member') = '' then ''
              else encode(sha256(convert_to(public.req_header('x-member'), 'UTF8')), 'hex') end
$$;

-- ---------- Tables ----------
create table if not exists public.members (
  id uuid primary key,
  crew text not null,
  key_hash text not null,
  name text not null default '' check (length(name) <= 40),
  handle text not null default '' check (length(handle) <= 40),
  bio text not null default '' check (length(bio) <= 160),
  avatar text not null default '' check (length(avatar) <= 16),
  photo text check (photo is null or length(photo) <= 150000),
  stats jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create index if not exists members_crew_idx on public.members (crew);

create table if not exists public.posts (
  id text primary key check (length(id) <= 64),
  crew text not null,
  member_id uuid not null references public.members (id) on delete cascade,
  key_hash text not null,
  title text not null default '' check (length(title) <= 80),
  started_at timestamptz not null,
  duration_s integer not null default 0,
  volume_kg real not null default 0,
  reps integer not null default 0,
  sets integer not null default 0,
  prs integer not null default 0,
  summary jsonb not null default '[]'::jsonb,
  photo text check (photo is null or length(photo) <= 400000),
  updated_at timestamptz not null default now()
);
create index if not exists posts_crew_started_idx on public.posts (crew, started_at desc);

create table if not exists public.props (
  post_id text not null references public.posts (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  crew text not null,
  key_hash text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, member_id)
);
create index if not exists props_crew_idx on public.props (crew);

-- ---------- Row level security ----------
alter table public.members enable row level security;
alter table public.posts enable row level security;
alter table public.props enable row level security;

do $$
declare t text;
begin
  foreach t in array array['members', 'posts', 'props'] loop
    execute format('drop policy if exists "crew reads" on public.%I', t);
    execute format('drop policy if exists "owner inserts" on public.%I', t);
    execute format('drop policy if exists "owner updates" on public.%I', t);
    execute format('drop policy if exists "owner deletes" on public.%I', t);

    execute format($p$create policy "crew reads" on public.%I for select to anon, authenticated
      using (crew = public.req_header('x-crew') and crew <> '')$p$, t);
    execute format($p$create policy "owner inserts" on public.%I for insert to anon, authenticated
      with check (crew = public.req_header('x-crew') and crew <> '' and key_hash = public.member_hash() and key_hash <> '')$p$, t);
    execute format($p$create policy "owner updates" on public.%I for update to anon, authenticated
      using (crew = public.req_header('x-crew') and key_hash = public.member_hash() and key_hash <> '')
      with check (crew = public.req_header('x-crew') and key_hash = public.member_hash() and key_hash <> '')$p$, t);
    execute format($p$create policy "owner deletes" on public.%I for delete to anon, authenticated
      using (crew = public.req_header('x-crew') and key_hash = public.member_hash() and key_hash <> '')$p$, t);
  end loop;
end $$;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.members, public.posts, public.props to anon, authenticated;
grant execute on function public.req_header(text), public.member_hash() to anon, authenticated;

-- Tell the API about the new tables right away.
notify pgrst, 'reload schema';
