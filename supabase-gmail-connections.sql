-- Таблица для хранения Gmail OAuth токенов пользователей
-- Выполни в Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS gmail_connections (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token  text NOT NULL,
  refresh_token text,
  expires_at    timestamptz NOT NULL,
  email         text,
  created_at    timestamptz DEFAULT now() NOT NULL,
  updated_at    timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

-- RLS: каждый видит только свои токены
ALTER TABLE gmail_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own gmail connection"
  ON gmail_connections
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Индекс для быстрого поиска по user_id
CREATE INDEX IF NOT EXISTS gmail_connections_user_id_idx ON gmail_connections(user_id);
