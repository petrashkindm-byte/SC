-- ============================================================
-- Subcuro — полная схема базы данных
-- Запусти целиком в Supabase SQL Editor
-- ============================================================

create extension if not exists "pgcrypto";

-- ── profiles ────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  full_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- ── categories ──────────────────────────────────────────────
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles (id) on delete cascade,
  slug text not null,
  label text not null,
  icon text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (owner_id, slug)
);

-- ── user_settings ────────────────────────────────────────────
create table if not exists public.user_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  base_currency text not null default 'RUB',
  locale text not null default 'ru',
  reminder_lead_days int[] not null default '{1,3,7}',
  custom_reminder_lead_days int,
  push_enabled boolean not null default false,
  push_permission text not null default 'not_determined',
  onboarding_completed boolean not null default false,
  seed_loaded boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- ── subscriptions ────────────────────────────────────────────
create table if not exists public.subscriptions (
  id text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  category_slug text not null default 'other'
    check (category_slug in ('entertainment','productivity','utilities','finance','health','shopping','education','other')),
  name text not null check (char_length(name) >= 2),
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'RUB' check (char_length(currency) = 3),
  billing_cycle text not null
    check (billing_cycle in ('weekly','monthly','quarterly','yearly','custom')),
  billing_interval int not null default 1 check (billing_interval > 0),
  custom_interval_days int check (custom_interval_days is null or custom_interval_days > 0),
  first_charge_date date not null,
  next_charge_date date not null,
  free_trial_end_date date,
  renewal_type text not null default 'auto_renew'
    check (renewal_type in ('auto_renew','manual')),
  cancellation_url text,
  management_url text,
  notes text,
  status text not null default 'active'
    check (status in ('active','paused','cancelled','archived')),
  icon text,
  price_increase_flag boolean not null default false,
  annual_renewal_at_risk boolean not null default false,
  last_used_at timestamptz,
  cancelled_at timestamptz,
  paused_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (next_charge_date >= first_charge_date),
  check (billing_cycle <> 'custom' or custom_interval_days is not null)
);

-- ── reminders ────────────────────────────────────────────────
create table if not exists public.reminders (
  id text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  subscription_id text not null references public.subscriptions (id) on delete cascade,
  remind_at timestamptz not null,
  channel text not null check (channel in ('local_push','email','in_app')),
  type text not null check (type in ('trial_end','renewal','price_check')),
  enabled boolean not null default true,
  delivered_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- ── индексы ──────────────────────────────────────────────────
create index if not exists subscriptions_user_status_idx on public.subscriptions (user_id, status);
create index if not exists subscriptions_next_charge_idx on public.subscriptions (user_id, next_charge_date);
create index if not exists reminders_subscription_remind_at_idx on public.reminders (subscription_id, remind_at);
create index if not exists categories_owner_slug_idx on public.categories (owner_id, slug);

-- ── updated_at триггер ───────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- ── автосоздание profile при регистрации ─────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- ── удаление данных пользователем ────────────────────────────
create or replace function public.delete_my_data()
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.reminders where user_id = auth.uid();
  delete from public.subscriptions where user_id = auth.uid();
  delete from public.categories where owner_id = auth.uid();
  delete from public.user_settings where user_id = auth.uid();
  delete from public.profiles where id = auth.uid();
end;
$$;

-- ── триггеры ─────────────────────────────────────────────────
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

drop trigger if exists user_settings_updated_at on public.user_settings;
create trigger user_settings_updated_at
  before update on public.user_settings
  for each row execute function public.handle_updated_at();

drop trigger if exists subscriptions_updated_at on public.subscriptions;
create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.handle_updated_at();

drop trigger if exists reminders_updated_at on public.reminders;
create trigger reminders_updated_at
  before update on public.reminders
  for each row execute function public.handle_updated_at();

-- ── RLS ──────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.user_settings enable row level security;
alter table public.subscriptions enable row level security;
alter table public.reminders enable row level security;

-- profiles
drop policy if exists "Profiles are readable by owner" on public.profiles;
create policy "Profiles are readable by owner"
  on public.profiles for select using (auth.uid() = id);

drop policy if exists "Profiles are insertable by owner" on public.profiles;
create policy "Profiles are insertable by owner"
  on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "Profiles are updateable by owner" on public.profiles;
create policy "Profiles are updateable by owner"
  on public.profiles for update using (auth.uid() = id);

-- user_settings
drop policy if exists "Settings readable by owner" on public.user_settings;
create policy "Settings readable by owner"
  on public.user_settings for select using (auth.uid() = user_id);

drop policy if exists "Settings insertable by owner" on public.user_settings;
create policy "Settings insertable by owner"
  on public.user_settings for insert with check (auth.uid() = user_id);

drop policy if exists "Settings updateable by owner" on public.user_settings;
create policy "Settings updateable by owner"
  on public.user_settings for update using (auth.uid() = user_id);

-- categories
drop policy if exists "Categories readable by owner or shared defaults" on public.categories;
create policy "Categories readable by owner or shared defaults"
  on public.categories for select using (owner_id is null or auth.uid() = owner_id);

drop policy if exists "Categories insertable by owner" on public.categories;
create policy "Categories insertable by owner"
  on public.categories for insert with check (auth.uid() = owner_id);

drop policy if exists "Categories updateable by owner" on public.categories;
create policy "Categories updateable by owner"
  on public.categories for update using (auth.uid() = owner_id);

-- subscriptions
drop policy if exists "Subscriptions readable by owner" on public.subscriptions;
create policy "Subscriptions readable by owner"
  on public.subscriptions for select using (auth.uid() = user_id);

drop policy if exists "Subscriptions insertable by owner" on public.subscriptions;
create policy "Subscriptions insertable by owner"
  on public.subscriptions for insert with check (auth.uid() = user_id);

drop policy if exists "Subscriptions updateable by owner" on public.subscriptions;
create policy "Subscriptions updateable by owner"
  on public.subscriptions for update using (auth.uid() = user_id);

drop policy if exists "Subscriptions deletable by owner" on public.subscriptions;
create policy "Subscriptions deletable by owner"
  on public.subscriptions for delete using (auth.uid() = user_id);

-- reminders
drop policy if exists "Reminders readable by owner" on public.reminders;
create policy "Reminders readable by owner"
  on public.reminders for select using (auth.uid() = user_id);

drop policy if exists "Reminders insertable by owner" on public.reminders;
create policy "Reminders insertable by owner"
  on public.reminders for insert with check (auth.uid() = user_id);

drop policy if exists "Reminders updateable by owner" on public.reminders;
create policy "Reminders updateable by owner"
  on public.reminders for update using (auth.uid() = user_id);

-- permissions
grant execute on function public.delete_my_data() to authenticated;

-- ── создать profile для уже существующих пользователей ───────
-- (запускается один раз, безопасно)
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

insert into public.user_settings (user_id)
select id from auth.users
on conflict (user_id) do nothing;
