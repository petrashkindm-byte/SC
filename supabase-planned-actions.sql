-- Запланированные действия по оптимизации подписок
-- Вставить в Supabase SQL Editor и нажать Run

create table public.planned_actions (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users not null,
  subscription_id   text not null,
  subscription_name text not null,
  saving_monthly    numeric not null default 0,
  currency    text not null default 'RUB',
  action_type text not null,
  target_service text,
  created_at  timestamptz default now(),
  constraint planned_actions_action_type_check check (
    action_type in (
      'switch_to_annual',
      'switch_to_family',
      'switch_to_cheaper',
      'switch_to_alternative'
    )
  )
);

alter table public.planned_actions enable row level security;

create policy "planned_actions_owner_select"
  on public.planned_actions for select
  using (auth.uid() = user_id);

create policy "planned_actions_owner_insert"
  on public.planned_actions for insert
  with check (auth.uid() = user_id);

create policy "planned_actions_owner_delete"
  on public.planned_actions for delete
  using (auth.uid() = user_id);

-- Индекс для быстрой выборки по пользователю
create index planned_actions_user_idx on public.planned_actions (user_id, created_at desc);
