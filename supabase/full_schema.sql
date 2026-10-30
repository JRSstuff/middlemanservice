-- =============================================================================
-- SafeSwap Complete Production Database Schema & Seed Script
-- Run this script in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. ENUMS
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE deal_status AS ENUM (
    'CREATED',            -- Deal created, terms shown, awaiting funding
    'PAYMENT_SUBMITTED',  -- Buyer submitted QR Ph receipt with reference number
    'PAYMENT_REJECTED',   -- SafeSwap staff rejected receipt (buyer can resubmit)
    'FUNDED',             -- Legacy/mock funded status
    'HELD',               -- Staff verified deposit in bank. Funds held in trust.
    'DELIVERED',          -- Seller marked item/service delivered + proof
    'CONFIRMED',          -- Buyer confirmed receipt & inspected item
    'PAYOUT_PENDING',     -- Buyer released funds; staff queued for manual disbursement
    'RELEASED',           -- Staff sent payout to seller via QR Ph/InstaPay
    'DISPUTED',           -- Contested by buyer or seller; staff review required
    'CANCELLED',          -- Cancelled prior to funding
    'REFUNDED',           -- Staff issued manual refund to buyer
    'EXPIRED'             -- Payment window or review window exceeded
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'buyer',
    'seller',
    'staff',
    'admin'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE proof_type AS ENUM (
    'photo',
    'file',
    'tracking_number',
    'notes'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE dispute_status AS ENUM (
    'open',
    'under_review',
    'resolved_buyer',
    'resolved_seller'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- 2. CORE UTILITY FUNCTIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit log entries and payment events are immutable and cannot be modified or deleted.';
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 3. PROFILES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'buyer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

DROP TRIGGER IF EXISTS on_profiles_updated ON public.profiles;
CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Trigger to auto-create profile when a user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(COALESCE(NEW.email, 'User'), '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE((NEW.raw_app_meta_data->>'role')::user_role, 'buyer')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- 4. DEALS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  title TEXT NOT NULL CHECK (char_length(title) >= 3 AND char_length(title) <= 200),
  description TEXT CHECK (char_length(description) <= 2000),
  terms TEXT NOT NULL CHECK (char_length(terms) >= 10),
  status deal_status NOT NULL DEFAULT 'CREATED',
  
  -- Money stored in MINOR UNITS (integers: e.g. centavos), NEVER floats
  price_amount BIGINT NOT NULL CHECK (price_amount > 0),
  price_currency TEXT NOT NULL DEFAULT 'PHP' CHECK (char_length(price_currency) = 3),
  service_fee_amount BIGINT NOT NULL DEFAULT 0 CHECK (service_fee_amount >= 0),
  
  -- Escrow reference codes
  payment_provider_ref TEXT,
  payment_session_id TEXT,
  
  -- Deadlines and Timestamps
  expires_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),

  CONSTRAINT check_distinct_participants CHECK (buyer_id <> seller_id)
);

CREATE INDEX IF NOT EXISTS idx_deals_buyer_status ON public.deals(buyer_id, status);
CREATE INDEX IF NOT EXISTS idx_deals_seller_status ON public.deals(seller_id, status);
CREATE INDEX IF NOT EXISTS idx_deals_status_expires ON public.deals(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_deals_created_at ON public.deals(created_at DESC);

DROP TRIGGER IF EXISTS on_deals_updated ON public.deals;
CREATE TRIGGER on_deals_updated
  BEFORE UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- 5. TIMELINE & AUDIT LOG TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.deal_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  from_status deal_status,
  to_status deal_status NOT NULL,
  action TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_timeline_deal ON public.deal_timeline(deal_id, created_at ASC);

CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE RESTRICT,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  from_status deal_status,
  to_status deal_status NOT NULL,
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_audit_log_deal ON public.audit_log(deal_id, created_at ASC);

DROP TRIGGER IF EXISTS trg_audit_log_immutable ON public.audit_log;
CREATE TRIGGER trg_audit_log_immutable
  BEFORE UPDATE OR DELETE ON public.audit_log
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_log_modification();

-- =============================================================================
-- 6. DELIVERY PROOFS & DISPUTES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.delivery_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  proof_type proof_type NOT NULL,
  file_path TEXT,
  tracking_number TEXT,
  carrier TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_delivery_proofs_deal ON public.delivery_proofs(deal_id);

CREATE TABLE IF NOT EXISTS public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE RESTRICT,
  raised_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL CHECK (char_length(reason) >= 10),
  status dispute_status NOT NULL DEFAULT 'open',
  resolution_notes TEXT,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_disputes_deal ON public.disputes(deal_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON public.disputes(status);

CREATE TABLE IF NOT EXISTS public.dispute_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  file_path TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_dispute_evidence_dispute ON public.dispute_evidence(dispute_id);

-- =============================================================================
-- 7. NOTIFICATIONS & WEBHOOKS
-- =============================================================================

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

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);

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

-- =============================================================================
-- 8. MANUAL QR PH PAYMENTS & STAFF WORKFLOW
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE RESTRICT,
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out', 'refund')),
  amount_centavos BIGINT NOT NULL CHECK (amount_centavos > 0),
  currency TEXT NOT NULL DEFAULT 'PHP',
  reference_number TEXT NOT NULL,
  proof_path TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'verified', 'rejected', 'completed')),
  submitted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  second_approver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  reject_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),

  -- Anti-fraud duplicate prevention
  CONSTRAINT uq_payment_direction_reference UNIQUE (direction, reference_number)
);

CREATE INDEX IF NOT EXISTS idx_payments_deal ON public.payments(deal_id);
CREATE INDEX IF NOT EXISTS idx_payments_status_direction ON public.payments(status, direction);

CREATE TABLE IF NOT EXISTS public.payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_payment_events_deal ON public.payment_events(deal_id);

DROP TRIGGER IF EXISTS trg_payment_events_immutable ON public.payment_events;
CREATE TRIGGER trg_payment_events_immutable
  BEFORE UPDATE OR DELETE ON public.payment_events
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_log_modification();

CREATE TABLE IF NOT EXISTS public.seller_payout_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_name TEXT NOT NULL,
  institution TEXT NOT NULL,
  account_number TEXT NOT NULL,
  qr_image_path TEXT,
  is_default BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_payout_methods_seller ON public.seller_payout_methods(seller_id);

DROP TRIGGER IF EXISTS trg_seller_payout_methods_updated ON public.seller_payout_methods;
CREATE TRIGGER trg_seller_payout_methods_updated
  BEFORE UPDATE ON public.seller_payout_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.staff_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  action_type TEXT NOT NULL,
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  notes TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_staff_actions_staff ON public.staff_actions(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_actions_deal ON public.staff_actions(deal_id);

DROP TRIGGER IF EXISTS trg_staff_actions_immutable ON public.staff_actions;
CREATE TRIGGER trg_staff_actions_immutable
  BEFORE UPDATE OR DELETE ON public.staff_actions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_log_modification();

-- =============================================================================
-- 9. HELPER FUNCTIONS & STATE MACHINE TRANSITION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (select auth.uid()) AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (select auth.uid()) AND role IN ('staff', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_deal_participant(deal_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.deals
    WHERE id = deal_id
      AND ((buyer_id = (select auth.uid())) OR (seller_id = (select auth.uid())))
  );
$$;

-- Core State Machine Function
CREATE OR REPLACE FUNCTION public.transition_deal(
  p_deal_id UUID,
  p_target_status deal_status,
  p_action TEXT,
  p_note TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deal RECORD;
  v_actor_id UUID;
  v_is_service_role BOOLEAN := false;
  v_is_staff BOOLEAN := false;
  v_actor_role TEXT;
  v_allowed BOOLEAN := false;
  v_counterparty_id UUID;
  v_first_verifier UUID;
BEGIN
  v_actor_id := auth.uid();

  -- Check for service_role caller
  IF current_setting('request.jwt.claims', true) IS NOT NULL THEN
    IF (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role' THEN
      v_is_service_role := true;
    END IF;
  END IF;

  -- Check for staff role
  IF v_actor_id IS NOT NULL THEN
    SELECT (role IN ('staff', 'admin')) INTO v_is_staff FROM public.profiles WHERE id = v_actor_id;
  END IF;

  -- Lock deal row
  SELECT * INTO v_deal FROM public.deals WHERE id = p_deal_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deal with id % not found', p_deal_id USING ERRCODE = 'P0002';
  END IF;

  -- Determine caller role
  IF v_is_service_role THEN
    v_actor_role := 'system';
  ELSIF v_is_staff THEN
    v_actor_role := 'staff';
  ELSIF v_actor_id = v_deal.buyer_id THEN
    v_actor_role := 'buyer';
  ELSIF v_actor_id = v_deal.seller_id THEN
    v_actor_role := 'seller';
  ELSE
    RAISE EXCEPTION 'Unauthorized: User % is not permitted to act on deal %', v_actor_id, p_deal_id USING ERRCODE = '42501';
  END IF;

  -- Transition validation rules
  IF v_deal.status = 'CREATED' THEN
    IF p_target_status = 'PAYMENT_SUBMITTED' AND v_actor_role IN ('buyer', 'system') THEN
      v_allowed := true;
    ELSIF p_target_status = 'FUNDED' AND v_actor_role IN ('buyer', 'system') THEN
      v_allowed := true;
    ELSIF p_target_status = 'CANCELLED' AND v_actor_role IN ('buyer', 'seller', 'staff', 'system') THEN
      v_allowed := true;
    ELSIF p_target_status = 'EXPIRED' AND v_actor_role IN ('staff', 'system') THEN
      v_allowed := true;
    END IF;

  ELSIF v_deal.status = 'PAYMENT_SUBMITTED' THEN
    IF p_target_status = 'HELD' AND v_actor_role IN ('staff', 'system') THEN
      v_allowed := true;
    ELSIF p_target_status = 'PAYMENT_REJECTED' AND v_actor_role IN ('staff', 'system') THEN
      v_allowed := true;
    ELSIF p_target_status = 'CANCELLED' AND v_actor_role IN ('buyer', 'staff', 'system') THEN
      v_allowed := true;
    END IF;

  ELSIF v_deal.status = 'PAYMENT_REJECTED' THEN
    IF p_target_status = 'PAYMENT_SUBMITTED' AND v_actor_role IN ('buyer', 'system') THEN
      v_allowed := true;
    ELSIF p_target_status = 'CANCELLED' AND v_actor_role IN ('buyer', 'staff', 'system') THEN
      v_allowed := true;
    END IF;

  ELSIF v_deal.status = 'FUNDED' THEN
    IF p_target_status = 'HELD' AND v_actor_role IN ('staff', 'system') THEN
      v_allowed := true;
    ELSIF p_target_status = 'CANCELLED' AND v_actor_role IN ('buyer', 'staff', 'system') THEN
      v_allowed := true;
    END IF;

  ELSIF v_deal.status = 'HELD' THEN
    IF p_target_status = 'DELIVERED' AND v_actor_role IN ('seller', 'staff', 'system') THEN
      v_allowed := true;
    ELSIF p_target_status = 'DISPUTED' AND v_actor_role IN ('buyer', 'seller', 'staff') THEN
      v_allowed := true;
    ELSIF p_target_status = 'REFUNDED' AND v_actor_role IN ('staff', 'system') THEN
      v_allowed := true;
    ELSIF p_target_status = 'EXPIRED' AND v_actor_role IN ('staff', 'system') THEN
      v_allowed := true;
    END IF;

  ELSIF v_deal.status = 'DELIVERED' THEN
    IF p_target_status = 'CONFIRMED' AND v_actor_role IN ('buyer', 'staff', 'system') THEN
      v_allowed := true;
    ELSIF p_target_status = 'PAYOUT_PENDING' AND v_actor_role IN ('buyer', 'staff', 'system') THEN
      v_allowed := true;
    ELSIF p_target_status = 'DISPUTED' AND v_actor_role IN ('buyer', 'seller', 'staff') THEN
      v_allowed := true;
    END IF;

  ELSIF v_deal.status = 'CONFIRMED' THEN
    IF p_target_status = 'PAYOUT_PENDING' AND v_actor_role IN ('buyer', 'staff', 'system') THEN
      v_allowed := true;
    ELSIF p_target_status = 'RELEASED' AND v_actor_role IN ('staff', 'system') THEN
      v_allowed := true;
    END IF;

  ELSIF v_deal.status = 'PAYOUT_PENDING' THEN
    IF p_target_status = 'RELEASED' AND v_actor_role IN ('staff', 'system') THEN
      -- Four-eyes separation check
      SELECT reviewed_by INTO v_first_verifier
      FROM public.payments
      WHERE deal_id = p_deal_id AND direction = 'in' AND status = 'verified'
      ORDER BY created_at DESC LIMIT 1;

      IF v_first_verifier IS NOT NULL AND v_actor_id IS NOT NULL AND v_first_verifier = v_actor_id AND NOT v_is_service_role THEN
        RAISE EXCEPTION 'Four-Eyes Rule Violation: Staff member who verified deposit cannot authorize seller payout.'
          USING ERRCODE = '42501';
      END IF;

      v_allowed := true;
    ELSIF p_target_status = 'DISPUTED' AND v_actor_role IN ('buyer', 'seller', 'staff') THEN
      v_allowed := true;
    END IF;

  ELSIF v_deal.status = 'DISPUTED' THEN
    IF p_target_status = 'CONFIRMED' AND v_actor_role IN ('staff', 'system') THEN
      v_allowed := true;
    ELSIF p_target_status = 'PAYOUT_PENDING' AND v_actor_role IN ('staff', 'system') THEN
      v_allowed := true;
    ELSIF p_target_status = 'RELEASED' AND v_actor_role IN ('staff', 'system') THEN
      v_allowed := true;
    ELSIF p_target_status = 'REFUNDED' AND v_actor_role IN ('staff', 'system') THEN
      v_allowed := true;
    END IF;
  END IF;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Invalid State Machine Transition: Cannot move deal from % to % as %',
      v_deal.status, p_target_status, v_actor_role USING ERRCODE = '22000';
  END IF;

  -- Apply status transition
  UPDATE public.deals
  SET
    status = p_target_status,
    delivered_at = CASE WHEN p_target_status = 'DELIVERED' THEN timezone('utc', now()) ELSE delivered_at END,
    confirmed_at = CASE WHEN p_target_status IN ('CONFIRMED', 'RELEASED') THEN timezone('utc', now()) ELSE confirmed_at END,
    updated_at = timezone('utc', now())
  WHERE id = p_deal_id;

  -- Insert user-facing timeline record
  INSERT INTO public.deal_timeline (deal_id, actor_id, from_status, to_status, action, note)
  VALUES (p_deal_id, v_actor_id, v_deal.status, p_target_status, p_action, p_note);

  -- Insert immutable audit record
  INSERT INTO public.audit_log (deal_id, actor_id, from_status, to_status, reason, metadata)
  VALUES (p_deal_id, v_actor_id, v_deal.status, p_target_status, p_action, p_metadata);

  -- Notify counterparty
  v_counterparty_id := CASE WHEN v_actor_id = v_deal.buyer_id THEN v_deal.seller_id ELSE v_deal.buyer_id END;
  IF v_counterparty_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, deal_id, type, title, body)
    VALUES (
      v_counterparty_id,
      p_deal_id,
      p_target_status::text,
      'Escrow Updated: ' || p_action,
      COALESCE(p_note, 'Deal status changed to ' || p_target_status::text)
    );
  END IF;

  RETURN jsonb_build_object(
    'deal_id', p_deal_id,
    'from_status', v_deal.status,
    'to_status', p_target_status,
    'action', p_action
  );
END;
$$;

-- =============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_payout_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_actions ENABLE ROW LEVEL SECURITY;

-- Profiles: Authenticated users can read profiles, update own
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING ((select auth.uid()) = id) WITH CHECK ((select auth.uid()) = id);

-- Deals: Participants & staff can select
DROP POLICY IF EXISTS "deals_select_participant" ON public.deals;
CREATE POLICY "deals_select_participant" ON public.deals FOR SELECT TO authenticated
  USING (buyer_id = (select auth.uid()) OR seller_id = (select auth.uid()) OR public.is_staff());

DROP POLICY IF EXISTS "deals_insert_creator" ON public.deals;
CREATE POLICY "deals_insert_creator" ON public.deals FOR INSERT TO authenticated
  WITH CHECK (
    ((select auth.uid()) = buyer_id OR (select auth.uid()) = seller_id) AND
    status = 'CREATED' AND
    payment_provider_ref IS NULL
  );

-- Timeline: Read by participants & staff
DROP POLICY IF EXISTS "timeline_select_participant" ON public.deal_timeline;
CREATE POLICY "timeline_select_participant" ON public.deal_timeline FOR SELECT TO authenticated
  USING (public.is_deal_participant(deal_id) OR public.is_staff());

-- Delivery Proofs: Read by participants & staff; inserted by seller
DROP POLICY IF EXISTS "delivery_proofs_select_participant" ON public.delivery_proofs;
CREATE POLICY "delivery_proofs_select_participant" ON public.delivery_proofs FOR SELECT TO authenticated
  USING (public.is_deal_participant(deal_id) OR public.is_staff());

DROP POLICY IF EXISTS "delivery_proofs_insert_seller" ON public.delivery_proofs;
CREATE POLICY "delivery_proofs_insert_seller" ON public.delivery_proofs FOR INSERT TO authenticated
  WITH CHECK (
    (select auth.uid()) = seller_id AND
    EXISTS (SELECT 1 FROM public.deals WHERE id = deal_id AND seller_id = (select auth.uid()))
  );

-- Disputes: Read by participants & staff
DROP POLICY IF EXISTS "disputes_select_participant" ON public.disputes;
CREATE POLICY "disputes_select_participant" ON public.disputes FOR SELECT TO authenticated
  USING (public.is_deal_participant(deal_id) OR public.is_staff());

DROP POLICY IF EXISTS "disputes_insert_participant" ON public.disputes;
CREATE POLICY "disputes_insert_participant" ON public.disputes FOR INSERT TO authenticated
  WITH CHECK (
    (select auth.uid()) = raised_by AND
    public.is_deal_participant(deal_id)
  );

-- Payments: Buyer sees own inbound receipts, seller sees outbound payout, staff sees all
DROP POLICY IF EXISTS "payments_select_participant" ON public.payments;
CREATE POLICY "payments_select_participant" ON public.payments FOR SELECT TO authenticated
  USING (
    public.is_staff() OR
    (submitted_by = (select auth.uid())) OR
    (direction = 'in' AND EXISTS (SELECT 1 FROM public.deals WHERE id = deal_id AND buyer_id = (select auth.uid()))) OR
    (direction = 'out' AND EXISTS (SELECT 1 FROM public.deals WHERE id = deal_id AND seller_id = (select auth.uid())))
  );

DROP POLICY IF EXISTS "payments_insert_buyer" ON public.payments;
CREATE POLICY "payments_insert_buyer" ON public.payments FOR INSERT TO authenticated
  WITH CHECK (
    direction = 'in' AND
    status = 'submitted' AND
    submitted_by = (select auth.uid()) AND
    EXISTS (SELECT 1 FROM public.deals WHERE id = deal_id AND buyer_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "payments_update_staff" ON public.payments;
CREATE POLICY "payments_update_staff" ON public.payments FOR UPDATE TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

-- Seller Payout Methods: Seller manages own, staff can view for disbursement
DROP POLICY IF EXISTS "payout_methods_select" ON public.seller_payout_methods;
CREATE POLICY "payout_methods_select" ON public.seller_payout_methods FOR SELECT TO authenticated
  USING (seller_id = (select auth.uid()) OR public.is_staff());

DROP POLICY IF EXISTS "payout_methods_all_owner" ON public.seller_payout_methods;
CREATE POLICY "payout_methods_all_owner" ON public.seller_payout_methods FOR ALL TO authenticated
  USING (seller_id = (select auth.uid())) WITH CHECK (seller_id = (select auth.uid()));

-- Staff Actions: Read only by staff
DROP POLICY IF EXISTS "staff_actions_select" ON public.staff_actions;
CREATE POLICY "staff_actions_select" ON public.staff_actions FOR SELECT TO authenticated
  USING (public.is_staff());

-- Notifications: Users manage own notifications
DROP POLICY IF EXISTS "notifications_owner" ON public.notifications;
CREATE POLICY "notifications_owner" ON public.notifications FOR ALL TO authenticated
  USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));

-- =============================================================================
-- 11. STORAGE BUCKETS & POLICIES
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('safeswap-evidence', 'safeswap-evidence', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('receipts', 'receipts', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760;

DROP POLICY IF EXISTS "evidence_storage_select" ON storage.objects;
CREATE POLICY "evidence_storage_select" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id IN ('safeswap-evidence', 'receipts') AND
    (public.is_staff() OR public.is_admin() OR auth.uid() IS NOT NULL)
  );

DROP POLICY IF EXISTS "evidence_storage_insert" ON storage.objects;
CREATE POLICY "evidence_storage_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('safeswap-evidence', 'receipts') AND
    auth.uid() IS NOT NULL
  );

-- =============================================================================
-- 12. SEED DATA (Test Accounts & Mock Escrow Deals)
-- =============================================================================

DO $$
DECLARE
  v_buyer_id UUID := '00000000-0000-0000-0000-000000000001';
  v_seller_id UUID := '00000000-0000-0000-0000-000000000002';
  v_staff_id UUID := '00000000-0000-0000-0000-000000000003';
  v_deal1_id UUID := '11111111-1111-1111-1111-111111111111';
  v_deal2_id UUID := '22222222-2222-2222-2222-222222222222';
  v_deal3_id UUID := '33333333-3333-3333-3333-333333333333';
BEGIN
  -- Insert into auth.users if not present
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES
    ('00000000-0000-0000-0000-000000000000', v_buyer_id, 'authenticated', 'authenticated', 'buyer@safeswap.dev', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"role":"buyer"}'::jsonb, '{"display_name":"Buyer Alex"}'::jsonb, now(), now()),
    ('00000000-0000-0000-0000-000000000000', v_seller_id, 'authenticated', 'authenticated', 'seller@safeswap.dev', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"role":"seller"}'::jsonb, '{"display_name":"Seller Maria"}'::jsonb, now(), now()),
    ('00000000-0000-0000-0000-000000000000', v_staff_id, 'authenticated', 'authenticated', 'staff@safeswap.dev', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"role":"staff"}'::jsonb, '{"display_name":"Staff Verification Specialist"}'::jsonb, now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- Insert/Update Profiles
  INSERT INTO public.profiles (id, email, display_name, role)
  VALUES
    (v_buyer_id, 'buyer@safeswap.dev', 'Buyer Alex', 'buyer'),
    (v_seller_id, 'seller@safeswap.dev', 'Seller Maria', 'seller'),
    (v_staff_id, 'staff@safeswap.dev', 'Staff Verification Specialist', 'staff')
  ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    role = EXCLUDED.role;

  -- Seller Payout Method for Seller Maria
  INSERT INTO public.seller_payout_methods (id, seller_id, account_name, institution, account_number, is_default)
  VALUES ('77777777-7777-7777-7777-777777777777', v_seller_id, 'Maria Santos', 'GCash', '09171234567', true)
  ON CONFLICT (id) DO NOTHING;

  -- Deal 1: HELD (MacBook Pro M3 Max)
  INSERT INTO public.deals (
    id, buyer_id, seller_id, title, description, terms, status,
    price_amount, price_currency, service_fee_amount, payment_provider_ref, expires_at
  ) VALUES (
    v_deal1_id, v_buyer_id, v_seller_id,
    'MacBook Pro M3 Max 16-inch 36GB',
    'Space Black, pristine condition, original charger and box included.',
    'Buyer inspects device within 48 hours of courier delivery. Battery cycle count <= 25.',
    'HELD',
    17500000, -- 175,000.00 PHP (in centavos)
    'PHP',
    525000,   -- 5,250.00 PHP (3% fee)
    'QRPH-DEP-111111',
    timezone('utc', now() + interval '3 days')
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.deal_timeline (deal_id, actor_id, from_status, to_status, action, note)
  VALUES
    (v_deal1_id, v_seller_id, NULL, 'CREATED', 'Deal Terms Established', 'Seller Maria created transaction terms'),
    (v_deal1_id, v_buyer_id, 'CREATED', 'PAYMENT_SUBMITTED', 'Payment Receipt Submitted', 'Buyer uploaded QR Ph receipt with ref #BDO-982143'),
    (v_deal1_id, v_staff_id, 'PAYMENT_SUBMITTED', 'HELD', 'Deposit Verified & Funds Held', 'SafeSwap staff verified ₱180,250.00 in escrow bank account. Funds locked.')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.payments (deal_id, direction, amount_centavos, currency, reference_number, status, submitted_by, reviewed_by, reviewed_at)
  VALUES (v_deal1_id, 'in', 18025000, 'PHP', 'BDO-982143', 'verified', v_buyer_id, v_staff_id, now() - interval '1 hour')
  ON CONFLICT (direction, reference_number) DO NOTHING;

  -- Deal 2: DELIVERED (Rolex Submariner Date)
  INSERT INTO public.deals (
    id, buyer_id, seller_id, title, description, terms, status,
    price_amount, price_currency, service_fee_amount, payment_provider_ref, delivered_at, expires_at
  ) VALUES (
    v_deal2_id, v_buyer_id, v_seller_id,
    'Rolex Submariner Date 126610LN',
    'Full set 2024 with box and warranty card from authorized dealer.',
    'Physical inspection at watchmaker required prior to confirmation.',
    'DELIVERED',
    72000000, -- 720,000.00 PHP
    'PHP',
    2160000,  -- 21,600.00 PHP (3% fee)
    'QRPH-DEP-222222',
    timezone('utc', now() - interval '4 hours'),
    timezone('utc', now() + interval '44 hours')
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.deal_timeline (deal_id, actor_id, from_status, to_status, action, note)
  VALUES
    (v_deal2_id, v_buyer_id, NULL, 'CREATED', 'Deal Created', 'Transaction terms agreed'),
    (v_deal2_id, v_staff_id, 'PAYMENT_SUBMITTED', 'HELD', 'Funds Secured in Escrow', 'Deposit verified'),
    (v_deal2_id, v_seller_id, 'HELD', 'DELIVERED', 'Dispatched via Armored Courier', 'Air21 Vault tracking: #AR-99321')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.delivery_proofs (deal_id, seller_id, proof_type, tracking_number, carrier, notes)
  VALUES (
    v_deal2_id, v_seller_id, 'tracking_number', 'AR-99321', 'Air21 Armored', 'Delivered to recipient safe deposit branch.'
  ) ON CONFLICT DO NOTHING;

  -- Deal 3: CREATED (Web App Development)
  INSERT INTO public.deals (
    id, buyer_id, seller_id, title, description, terms, status,
    price_amount, price_currency, service_fee_amount, expires_at
  ) VALUES (
    v_deal3_id, v_buyer_id, v_seller_id,
    'Custom Web Application Development (Milestone 1)',
    'Frontend architecture and prototype design system deliverables.',
    'Source code delivered via private GitHub repository with full test coverage.',
    'CREATED',
    5000000, -- 50,000.00 PHP
    'PHP',
    150000,  -- 1,500.00 PHP (3% fee)
    timezone('utc', now() + interval '5 days')
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.deal_timeline (deal_id, actor_id, from_status, to_status, action, note)
  VALUES
    (v_deal3_id, v_seller_id, NULL, 'CREATED', 'Milestone Terms Created', 'Awaiting buyer payment')
  ON CONFLICT DO NOTHING;

END $$;
