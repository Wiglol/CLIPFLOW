-- CLIPFLOW schema (Supabase)
-- Run this in Supabase SQL editor (or via migrations) before using the app.

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- -----------------
-- Core tables
-- -----------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username citext not null,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_username_key on public.profiles (username);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  original_url text not null,
  video_id text not null,
  embed_url text not null,
  caption text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_video_id_len check (char_length(video_id) between 5 and 32)
);

create table if not exists public.hashtags (
  id bigint generated always as identity primary key,
  tag citext not null,
  created_at timestamptz not null default now(),
  constraint hashtags_tag_len check (char_length(tag) between 1 and 64)
);

create unique index if not exists hashtags_tag_key on public.hashtags (tag);

create table if not exists public.post_hashtags (
  post_id uuid not null references public.posts(id) on delete cascade,
  hashtag_id bigint not null references public.hashtags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, hashtag_id)
);

create table if not exists public.likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_not_self check (follower_id <> following_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comments_content_len check (char_length(content) between 1 and 800)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now(),
  constraint reports_reason_len check (char_length(reason) between 3 and 300)
);

create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_not_self check (blocker_id <> blocked_id)
);

create table if not exists public.not_interested (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

-- -----------------
-- Indexes
-- -----------------

create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists comments_post_created_at_idx on public.comments (post_id, created_at);
create index if not exists likes_post_id_idx on public.likes (post_id);
create index if not exists follows_follower_idx on public.follows (follower_id);
create index if not exists follows_following_idx on public.follows (following_id);
create index if not exists blocks_blocker_idx on public.blocks (blocker_id);
create index if not exists not_interested_user_idx on public.not_interested (user_id);


-- -----------------
-- updated_at helpers
-- -----------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_posts_updated_at on public.posts;
create trigger trg_posts_updated_at
before update on public.posts
for each row execute function public.set_updated_at();

drop trigger if exists trg_comments_updated_at on public.comments;
create trigger trg_comments_updated_at
before update on public.comments
for each row execute function public.set_updated_at();

-- -----------------
-- Public read views (fast simple reads)
-- -----------------

create or replace view public.v_posts_public as
select
  p.id,
  p.user_id,
  p.original_url,
  p.video_id,
  p.embed_url,
  p.caption,
  p.created_at,
  pr.username as author_username,
  pr.display_name as author_display_name,
  pr.avatar_url as author_avatar_url,
  (select count(*)::int from public.likes l where l.post_id = p.id) as like_count,
  (select count(*)::int from public.comments c where c.post_id = p.id) as comment_count
from public.posts p
join public.profiles pr on pr.id = p.user_id;

create or replace view public.v_comments_public as
select
  c.id,
  c.post_id,
  c.user_id,
  c.content,
  c.created_at,
  pr.username,
  pr.display_name,
  pr.avatar_url
from public.comments c
join public.profiles pr on pr.id = c.user_id;

grant select on public.v_posts_public to anon, authenticated;
grant select on public.v_comments_public to anon, authenticated;

-- -----------------
-- Row Level Security
-- -----------------

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.likes enable row level security;
alter table public.follows enable row level security;
alter table public.comments enable row level security;
alter table public.reports enable row level security;
alter table public.blocks enable row level security;
alter table public.not_interested enable row level security;
alter table public.hashtags enable row level security;
alter table public.post_hashtags enable row level security;

-- PROFILES

drop policy if exists "profiles_select_public" on public.profiles;
create policy "profiles_select_public"
on public.profiles
for select
using (true);

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- POSTS

drop policy if exists "posts_select_public" on public.posts;
create policy "posts_select_public"
on public.posts
for select
using (true);

drop policy if exists "posts_insert_auth" on public.posts;
create policy "posts_insert_auth"
on public.posts
for insert
with check (auth.uid() = user_id);

drop policy if exists "posts_update_own" on public.posts;
create policy "posts_update_own"
on public.posts
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "posts_delete_own" on public.posts;
create policy "posts_delete_own"
on public.posts
for delete
using (auth.uid() = user_id);

-- LIKES

drop policy if exists "likes_select_public" on public.likes;
create policy "likes_select_public"
on public.likes
for select
using (true);

drop policy if exists "likes_insert_own" on public.likes;
create policy "likes_insert_own"
on public.likes
for insert
with check (auth.uid() = user_id);

drop policy if exists "likes_delete_own" on public.likes;
create policy "likes_delete_own"
on public.likes
for delete
using (auth.uid() = user_id);

-- FOLLOWS

drop policy if exists "follows_select_public" on public.follows;
create policy "follows_select_public"
on public.follows
for select
using (true);

drop policy if exists "follows_insert_own" on public.follows;
create policy "follows_insert_own"
on public.follows
for insert
with check (auth.uid() = follower_id);

drop policy if exists "follows_delete_own" on public.follows;
create policy "follows_delete_own"
on public.follows
for delete
using (auth.uid() = follower_id);

-- COMMENTS

drop policy if exists "comments_select_public" on public.comments;
create policy "comments_select_public"
on public.comments
for select
using (true);

drop policy if exists "comments_insert_auth" on public.comments;
create policy "comments_insert_auth"
on public.comments
for insert
with check (auth.uid() = user_id);

drop policy if exists "comments_delete_own" on public.comments;
create policy "comments_delete_own"
on public.comments
for delete
using (auth.uid() = user_id);

-- REPORTS

drop policy if exists "reports_insert_auth" on public.reports;
create policy "reports_insert_auth"
on public.reports
for insert
with check (auth.uid() = reporter_id);
-- no select policy by default (admin-only via dashboard/service role)

-- BLOCKS

drop policy if exists "blocks_select_own" on public.blocks;
create policy "blocks_select_own"
on public.blocks
for select
using (auth.uid() = blocker_id);

drop policy if exists "blocks_insert_own" on public.blocks;
create policy "blocks_insert_own"
on public.blocks
for insert
with check (auth.uid() = blocker_id);

drop policy if exists "blocks_delete_own" on public.blocks;
create policy "blocks_delete_own"
on public.blocks
for delete
using (auth.uid() = blocker_id);

-- NOT INTERESTED

drop policy if exists "not_interested_select_own" on public.not_interested;
create policy "not_interested_select_own"
on public.not_interested
for select
using (auth.uid() = user_id);

drop policy if exists "not_interested_insert_own" on public.not_interested;
create policy "not_interested_insert_own"
on public.not_interested
for insert
with check (auth.uid() = user_id);

drop policy if exists "not_interested_delete_own" on public.not_interested;
create policy "not_interested_delete_own"
on public.not_interested
for delete
using (auth.uid() = user_id);

-- HASHTAGS

drop policy if exists "hashtags_select_public" on public.hashtags;
create policy "hashtags_select_public"
on public.hashtags
for select
using (true);

drop policy if exists "hashtags_insert_auth" on public.hashtags;
create policy "hashtags_insert_auth"
on public.hashtags
for insert
with check (auth.uid() is not null);

-- POST_HASHTAGS

drop policy if exists "post_hashtags_select_public" on public.post_hashtags;
create policy "post_hashtags_select_public"
on public.post_hashtags
for select
using (true);

drop policy if exists "post_hashtags_insert_own" on public.post_hashtags;
create policy "post_hashtags_insert_own"
on public.post_hashtags
for insert
with check (
  exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid())
);

drop policy if exists "post_hashtags_delete_own" on public.post_hashtags;
create policy "post_hashtags_delete_own"
on public.post_hashtags
for delete
using (
  exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid())
);

-- -----------------
-- Realtime (comments)
-- -----------------

do $$
begin
  alter publication supabase_realtime add table public.comments;
exception when duplicate_object then
  null;
end;
$$;

-- -----------------
-- Minimal DB-side rate limiting (per user, per minute)
-- -----------------

create or replace function public.enforce_rate_limit(table_name text, user_col text, max_per_min int)
returns void
language plpgsql
as $$
declare
  cnt int;
begin
  execute format(
    'select count(*)::int from %I where %I = auth.uid() and created_at > now() - interval ''60 seconds''',
    table_name,
    user_col
  ) into cnt;

  if cnt >= max_per_min then
    raise exception 'Slow down. Try again in a minute.' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.rate_limit_posts()
returns trigger
language plpgsql
as $$
begin
  perform public.enforce_rate_limit('posts', 'user_id', 6);
  return new;
end;
$$;

drop trigger if exists trg_rate_limit_posts on public.posts;
create trigger trg_rate_limit_posts
before insert on public.posts
for each row execute function public.rate_limit_posts();

create or replace function public.rate_limit_comments()
returns trigger
language plpgsql
as $$
begin
  perform public.enforce_rate_limit('comments', 'user_id', 20);
  return new;
end;
$$;

drop trigger if exists trg_rate_limit_comments on public.comments;
create trigger trg_rate_limit_comments
before insert on public.comments
for each row execute function public.rate_limit_comments();

create or replace function public.rate_limit_reports()
returns trigger
language plpgsql
as $$
begin
  perform public.enforce_rate_limit('reports', 'reporter_id', 10);
  return new;
end;
$$;

drop trigger if exists trg_rate_limit_reports on public.reports;
create trigger trg_rate_limit_reports
before insert on public.reports
for each row execute function public.rate_limit_reports();
