-- ============================================================
-- Subcuro — таблица истории сохранений (savings_actions)
-- Запусти в Supabase SQL Editor
-- ============================================================

create table if not exists public.savings_actions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  -- snapshot данных подписки на момент отмены
  subscription_id   text not null,
  subscription_name text not null,
  amount_monthly    numeric(12,2) not null,  -- приведённая сумма в месяц
  currency          text not null default 'RUB',
  action_type       text not null default 'cancelled'
    check (action_type in ('cancelled', 'downgraded', 'switched')),
  -- необязательные поля
  note         text,
  acted_at     timestamptz not null default timezone('utc', now())
);

-- индексы
create index if not exists savings_actions_user_id_idx on public.savings_actions (user_id);
create index if not exists savings_actions_acted_at_idx on public.savings_actions (user_id, acted_at desc);

-- RLS
alter table public.savings_actions enable row level security;

create policy "savings_actions: owner read"
  on public.savings_actions for select
  using (auth.uid() = user_id);

create policy "savings_actions: owner insert"
  on public.savings_actions for insert
  with check (auth.uid() = user_id);

create policy "savings_actions: owner delete"
  on public.savings_actions for delete
  using (auth.uid() = user_id);
