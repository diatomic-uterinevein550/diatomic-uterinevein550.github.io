-- 星巴克城市杯图鉴 · Supabase 建表脚本
--
-- 用法：Supabase 控制台 → SQL Editor → 粘贴执行。可重复执行，不会重复建。
--
-- 安全模型：所有表都开启行级安全（RLS），策略是 auth.uid() = user_id。
-- 这意味着即使有人拿到公开的 anon key（那个 key 本来就是设计成公开的），
-- 也只能读写自己那几行，读不到别人的收藏。前端代码不参与鉴权判断。

-- ─────────────────────────────────────────────────────────────
-- 收藏记录
-- ─────────────────────────────────────────────────────────────
create table if not exists public.collections (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  mug_id     text        not null,
  -- 'none' 是墓碑：表示"这条被删掉了"。多设备同步靠它区分
  -- "对方还没同步到" 和 "对方已经删掉了"，否则删除会被旧设备复活。
  status     text        not null default 'none'
             check (status in ('owned', 'wish', 'none')),
  note       text        default '',
  added_on   date,
  updated_at timestamptz not null default now(),
  primary key (user_id, mug_id)
);

comment on table public.collections is '每位用户对每款杯子的收藏状态与备注';
comment on column public.collections.status is 'owned=已拥有, wish=愿望单, none=墓碑（已删除）';

alter table public.collections enable row level security;

drop policy if exists "collections_own_rows" on public.collections;
create policy "collections_own_rows"
  on public.collections
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists collections_user_updated_idx
  on public.collections (user_id, updated_at desc);

-- updated_at 由数据库维护，前端改不了，避免时钟不准导致合并错乱
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists collections_touch on public.collections;
create trigger collections_touch
  before update on public.collections
  for each row execute function public.touch_updated_at();


-- ─────────────────────────────────────────────────────────────
-- 昵称（分享链接上显示的名字，不想暴露邮箱）
-- ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  display_name text default '',
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_own_row" on public.profiles;
create policy "profiles_own_row"
  on public.profiles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();


-- ─────────────────────────────────────────────────────────────
-- 实拍照片存储桶
-- 路径约定：{user_id}/{mug_id}.jpg —— 策略靠路径第一段判断归属
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mug-photos', 'mug-photos', false, 1048576,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "photos_own_files" on storage.objects;
create policy "photos_own_files"
  on storage.objects
  for all
  using (
    bucket_id = 'mug-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'mug-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ─────────────────────────────────────────────────────────────
-- 自检：执行完应当看到 3 条 rowsecurity=true
-- ─────────────────────────────────────────────────────────────
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname in ('public', 'storage')
  and tablename in ('collections', 'profiles', 'objects');
