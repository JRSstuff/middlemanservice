-- 00006_create_webhooks_and_notifications.sql
-- Webhook idempotency and Participant In-App Notifications

-- 1. Webhook Events table with UNIQUE provider_event_id for strict idempotency
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_event_id TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processed', 'failed', 'duplicate')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_webhooks_provider_event ON public.webhook_events(provider, provider_event_id);
CREATE INDEX idx_webhooks_status ON public.webhook_events(processing_status);

-- 2. Notifications table for live user feedback
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, read) WHERE read = false;
CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
