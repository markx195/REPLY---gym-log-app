-- REPLY soft-launch schema (safe to re-run)
-- Enables Auth users + cloud sync for preferences, history, custom lists, favorites.

create extension if not exists "pgcrypto";

-- Profiles ---------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  email text,
  auth_mode text,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Preferences (JSON blob matching UserPreferences) -----------------------
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

drop policy if exists "prefs_select_own" on public.user_preferences;
drop policy if exists "prefs_upsert_own" on public.user_preferences;
drop policy if exists "prefs_update_own" on public.user_preferences;

create policy "prefs_select_own"
  on public.user_preferences for select
  using (auth.uid() = user_id);

create policy "prefs_upsert_own"
  on public.user_preferences for insert
  with check (auth.uid() = user_id);

create policy "prefs_update_own"
  on public.user_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- History sessions -------------------------------------------------------
create table if not exists public.history_sessions (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  payload jsonb not null,
  session_date date,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists history_sessions_user_date_idx
  on public.history_sessions (user_id, session_date desc);

alter table public.history_sessions enable row level security;

drop policy if exists "history_select_own" on public.history_sessions;
drop policy if exists "history_insert_own" on public.history_sessions;
drop policy if exists "history_update_own" on public.history_sessions;
drop policy if exists "history_delete_own" on public.history_sessions;

create policy "history_select_own"
  on public.history_sessions for select
  using (auth.uid() = user_id);

create policy "history_insert_own"
  on public.history_sessions for insert
  with check (auth.uid() = user_id);

create policy "history_update_own"
  on public.history_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "history_delete_own"
  on public.history_sessions for delete
  using (auth.uid() = user_id);

-- Custom workouts --------------------------------------------------------
create table if not exists public.custom_workouts (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.custom_workouts enable row level security;

drop policy if exists "customs_select_own" on public.custom_workouts;
drop policy if exists "customs_insert_own" on public.custom_workouts;
drop policy if exists "customs_update_own" on public.custom_workouts;
drop policy if exists "customs_delete_own" on public.custom_workouts;

create policy "customs_select_own"
  on public.custom_workouts for select
  using (auth.uid() = user_id);

create policy "customs_insert_own"
  on public.custom_workouts for insert
  with check (auth.uid() = user_id);

create policy "customs_update_own"
  on public.custom_workouts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "customs_delete_own"
  on public.custom_workouts for delete
  using (auth.uid() = user_id);

-- Favorites --------------------------------------------------------------
create table if not exists public.favorites (
  user_id uuid primary key references auth.users (id) on delete cascade,
  workout_ids text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.favorites enable row level security;

drop policy if exists "favorites_select_own" on public.favorites;
drop policy if exists "favorites_insert_own" on public.favorites;
drop policy if exists "favorites_update_own" on public.favorites;
drop policy if exists "favorites_delete_own" on public.favorites;

create policy "favorites_select_own"
  on public.favorites for select
  using (auth.uid() = user_id);

create policy "favorites_insert_own"
  on public.favorites for insert
  with check (auth.uid() = user_id);

create policy "favorites_update_own"
  on public.favorites for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "favorites_delete_own"
  on public.favorites for delete
  using (auth.uid() = user_id);

-- Auto-create profile on signup ------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email, auth_mode)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'Athlete'),
    new.email,
    coalesce(new.raw_app_meta_data->>'provider', 'email')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
