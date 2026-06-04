-- Add management_url column to subscriptions (idempotent).
-- Stores the provider's "manage subscription" deep-link, surfaced by the
-- "Управление подпиской" button in the subscription detail panel.
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS management_url TEXT;
