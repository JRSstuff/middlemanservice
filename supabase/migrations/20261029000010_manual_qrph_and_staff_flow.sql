-- 00010_manual_qrph_and_staff_flow.sql
-- Migration for Manual QR Ph Escrow Flow, Staff Console, and State Machine Updates

-- 1. Extend deal_status enum with manual verification and payout states
-- Postgres allows adding enum values using ALTER TYPE ... ADD VALUE IF NOT EXISTS
ALTER TYPE deal_status ADD VALUE IF NOT EXISTS 'PAYMENT_SUBMITTED';
ALTER TYPE deal_status ADD VALUE IF NOT EXISTS 'PAYMENT_REJECTED';
ALTER TYPE deal_status ADD VALUE IF NOT EXISTS 'PAYOUT_PENDING';
ALTER TYPE deal_status ADD VALUE IF NOT EXISTS 'RELEASED';

-- Extend user_role to include 'staff'
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'staff';

-- 2. Payments Table (Records buyer inbound deposits, seller outbound payouts, and refunds)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE RESTRICT,
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out', 'refund')),
  amount_centavos BIGINT NOT NULL CHECK (amount_centavos > 0),
  currency TEXT NOT NULL DEFAULT 'PHP',
  reference_number TEXT NOT NULL,
  proof_path TEXT, -- Storage path to receipt screenshot or PDF
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'verified', 'rejected', 'completed')),
  submitted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  second_approver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- for four-eyes rule
  reviewed_at TIMESTAMPTZ,
  reject_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),

  -- Fraud protection: bank reference number cannot be reused for the same direction across different transactions
  CONSTRAINT uq_payment_direction_reference UNIQUE (direction, reference_number)
);

CREATE INDEX IF NOT EXISTS idx_payments_deal ON public.payments(deal_id);
CREATE INDEX IF NOT EXISTS idx_payments_status_direction ON public.payments(status, direction);
CREATE INDEX IF NOT EXISTS idx_payments_created ON public.payments(created_at DESC);

-- 3. Payment Events Table (Append-only idempotency ledger replacing webhook_events)
CREATE TABLE IF NOT EXISTS public.payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_payment_events_idempotency ON public.payment_events(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_payment_events_deal ON public.payment_events(deal_id);

-- Enforce append-only on payment_events
CREATE TRIGGER trg_payment_events_immutable
  BEFORE UPDATE OR DELETE ON public.payment_events
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_log_modification();

-- 4. Seller Payout Methods (Private bank / e-wallet details for QR Ph / InstaPay disbursements)
CREATE TABLE IF NOT EXISTS public.seller_payout_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_name TEXT NOT NULL,
  institution TEXT NOT NULL, -- e.g. 'GCash', 'Maya', 'BDO', 'BPI', 'UnionBank'
  account_number TEXT NOT NULL, -- Stored securely, masked in client UI
  qr_image_path TEXT, -- Optional uploaded QR Ph image
  is_default BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_payout_methods_seller ON public.seller_payout_methods(seller_id);

CREATE TRIGGER trg_seller_payout_methods_updated
  BEFORE UPDATE ON public.seller_payout_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 5. Staff Actions Audit Trail (Append-only, strictly immutable)
CREATE TABLE IF NOT EXISTS public.staff_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  action TEXT NOT NULL, -- 'VERIFY_PAYMENT', 'REJECT_PAYMENT', 'REVEAL_PAYOUT_DETAILS', 'EXECUTE_PAYOUT', 'EXECUTE_REFUND'
  target_deal_id UUID REFERENCES public.deals(id) ON DELETE RESTRICT,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_staff_actions_deal ON public.staff_actions(target_deal_id);
CREATE INDEX IF NOT EXISTS idx_staff_actions_staff ON public.staff_actions(staff_id);

CREATE TRIGGER trg_staff_actions_immutable
  BEFORE UPDATE OR DELETE ON public.staff_actions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_log_modification();

-- 6. Helper check functions for staff and admin roles
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

-- 7. Updated transition_deal function supporting Manual QR Ph states & Four-Eyes Rule
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
  v_payout_threshold BIGINT := 5000000; -- 50,000.00 PHP default threshold for four-eyes approval
BEGIN
  v_actor_id := auth.uid();

  -- Detect service_role
  IF current_setting('request.jwt.claims', true) IS NOT NULL THEN
    IF (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role' THEN
      v_is_service_role := true;
    END IF;
  END IF;

  -- Detect staff or admin
  IF v_actor_id IS NOT NULL THEN
    SELECT (role IN ('staff', 'admin')) INTO v_is_staff FROM public.profiles WHERE id = v_actor_id;
  END IF;

  -- Fetch deal
  SELECT * INTO v_deal FROM public.deals WHERE id = p_deal_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deal with id % not found', p_deal_id USING ERRCODE = 'P0002';
  END IF;

  -- Determine role
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

  -- State machine transition rules for Manual QR Ph escrow flow:
  -- CREATED
  IF v_deal.status = 'CREATED' THEN
    IF p_target_status = 'PAYMENT_SUBMITTED' AND v_actor_role IN ('buyer', 'system') THEN
      v_allowed := true;
    ELSIF p_target_status = 'CANCELLED' AND v_actor_role IN ('buyer', 'seller', 'staff', 'system') THEN
      v_allowed := true;
    ELSIF p_target_status = 'EXPIRED' AND v_actor_role IN ('staff', 'system') THEN
      v_allowed := true;
    END IF;

  -- PAYMENT_SUBMITTED (Buyer uploaded proof, waiting for SafeSwap staff verification)
  ELSIF v_deal.status = 'PAYMENT_SUBMITTED' THEN
    IF p_target_status = 'HELD' AND v_actor_role IN ('staff', 'system') THEN
      v_allowed := true;
    ELSIF p_target_status = 'PAYMENT_REJECTED' AND v_actor_role IN ('staff', 'system') THEN
      v_allowed := true;
    ELSIF p_target_status = 'CANCELLED' AND v_actor_role IN ('buyer', 'staff', 'system') THEN
      v_allowed := true;
    END IF;

  -- PAYMENT_REJECTED (Staff rejected buyer receipt, buyer may resubmit with corrected proof)
  ELSIF v_deal.status = 'PAYMENT_REJECTED' THEN
    IF p_target_status = 'PAYMENT_SUBMITTED' AND v_actor_role IN ('buyer', 'system') THEN
      v_allowed := true;
    ELSIF p_target_status = 'CANCELLED' AND v_actor_role IN ('buyer', 'staff', 'system') THEN
      v_allowed := true;
    END IF;

  -- HELD (Funds verified and securely held in SafeSwap account. Seller CANNOT withdraw yet)
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

  -- DELIVERED (Seller fulfilled delivery, buyer inspects)
  ELSIF v_deal.status = 'DELIVERED' THEN
    IF p_target_status = 'CONFIRMED' AND v_actor_role IN ('buyer', 'staff', 'system') THEN
      v_allowed := true;
    ELSIF p_target_status = 'PAYOUT_PENDING' AND v_actor_role IN ('buyer', 'staff', 'system') THEN
      v_allowed := true;
    ELSIF p_target_status = 'DISPUTED' AND v_actor_role IN ('buyer', 'seller', 'staff') THEN
      v_allowed := true;
    END IF;

  -- CONFIRMED -> PAYOUT_PENDING (Staff queued payout to seller)
  ELSIF v_deal.status = 'CONFIRMED' THEN
    IF p_target_status = 'PAYOUT_PENDING' AND v_actor_role IN ('buyer', 'staff', 'system') THEN
      v_allowed := true;
    ELSIF p_target_status = 'RELEASED' AND v_actor_role IN ('staff', 'system') THEN
      v_allowed := true;
    END IF;

  -- PAYOUT_PENDING (Staff is sending manual payout via QR Ph/InstaPay)
  ELSIF v_deal.status = 'PAYOUT_PENDING' THEN
    IF p_target_status = 'RELEASED' AND v_actor_role IN ('staff', 'system') THEN
      -- FOUR-EYES RULE:
      -- Check if the deal was verified by this same staff member
      SELECT reviewed_by INTO v_first_verifier
      FROM public.payments
      WHERE deal_id = p_deal_id AND direction = 'in' AND status = 'verified'
      ORDER BY created_at DESC LIMIT 1;

      IF v_first_verifier IS NOT NULL AND v_actor_id IS NOT NULL AND v_first_verifier = v_actor_id AND NOT v_is_service_role THEN
        RAISE EXCEPTION 'Four-Eyes Rule Violation: The staff member who verified the buyer deposit cannot also approve the seller payout.'
          USING ERRCODE = '42501';
      END IF;

      v_allowed := true;
    ELSIF p_target_status = 'DISPUTED' AND v_actor_role IN ('buyer', 'seller', 'staff') THEN
      v_allowed := true;
    END IF;

  -- DISPUTED (Staff resolution)
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

  -- EXPIRED
  ELSIF v_deal.status = 'EXPIRED' THEN
    IF p_target_status IN ('CONFIRMED', 'PAYOUT_PENDING', 'RELEASED', 'REFUNDED') AND v_actor_role IN ('staff', 'system') THEN
      v_allowed := true;
    END IF;
  END IF;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Illegal state transition: Cannot move deal from % to % as %', 
      v_deal.status, p_target_status, v_actor_role USING ERRCODE = 'P0001';
  END IF;

  -- Update deal
  UPDATE public.deals
  SET
    status = p_target_status,
    delivered_at = CASE WHEN p_target_status = 'DELIVERED' THEN timezone('utc', now()) ELSE delivered_at END,
    confirmed_at = CASE WHEN p_target_status IN ('CONFIRMED', 'PAYOUT_PENDING') AND confirmed_at IS NULL THEN timezone('utc', now()) ELSE confirmed_at END,
    updated_at = timezone('utc', now())
  WHERE id = p_deal_id;

  -- Insert Timeline
  INSERT INTO public.deal_timeline (deal_id, actor_id, from_status, to_status, action, note)
  VALUES (p_deal_id, v_actor_id, v_deal.status, p_target_status, p_action, p_note);

  -- Insert Audit Log
  INSERT INTO public.audit_log (deal_id, actor_id, from_status, to_status, reason, metadata)
  VALUES (
    p_deal_id,
    v_actor_id,
    v_deal.status,
    p_target_status,
    COALESCE(p_note, p_action),
    jsonb_build_object(
      'actor_role', v_actor_role,
      'extra', p_metadata
    )
  );

  -- Insert Staff Audit if performed by staff
  IF v_is_staff AND v_actor_id IS NOT NULL THEN
    INSERT INTO public.staff_actions (staff_id, action, target_deal_id, metadata)
    VALUES (
      v_actor_id,
      'STATUS_TRANSITION_' || p_target_status::text,
      p_deal_id,
      jsonb_build_object('from', v_deal.status, 'to', p_target_status, 'note', p_note)
    );
  END IF;

  -- Counterparty In-App Notification
  IF v_actor_role = 'buyer' THEN
    v_counterparty_id := v_deal.seller_id;
  ELSIF v_actor_role = 'seller' THEN
    v_counterparty_id := v_deal.buyer_id;
  END IF;

  IF v_counterparty_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, deal_id, type, title, body)
    VALUES (
      v_counterparty_id,
      p_deal_id,
      'STATUS_CHANGE',
      'Deal Update: ' || p_target_status::text,
      p_action || CASE WHEN p_note IS NOT NULL THEN ' - ' || p_note ELSE '' END
    );
  ELSIF v_actor_role IN ('staff', 'system') THEN
    INSERT INTO public.notifications (user_id, deal_id, type, title, body)
    VALUES
      (v_deal.buyer_id, p_deal_id, 'STATUS_CHANGE', 'Deal Update: ' || p_target_status::text, p_action),
      (v_deal.seller_id, p_deal_id, 'STATUS_CHANGE', 'Deal Update: ' || p_target_status::text, p_action);
  END IF;

  SELECT to_jsonb(d) INTO v_deal FROM public.deals d WHERE d.id = p_deal_id;
  RETURN v_deal;
END;
$$;

-- 8. Row Level Security for New Tables
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_payout_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_actions ENABLE ROW LEVEL SECURITY;

-- Payments: Buyer and Seller can read payments for their deal; Staff can read all
CREATE POLICY "payments_select_participant_or_staff"
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    is_deal_participant(deal_id) OR is_staff()
  );

-- Payments: Buyer can insert 'in' direction payment proof for their deal
CREATE POLICY "payments_insert_buyer"
  ON public.payments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    direction = 'in' AND
    submitted_by = (select auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.deals
      WHERE id = deal_id AND buyer_id = (select auth.uid())
    )
  );

-- Payments: Only staff can update (verify/reject)
CREATE POLICY "payments_update_staff_only"
  ON public.payments
  FOR UPDATE
  TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());

-- Seller Payout Methods: Seller can manage their own; Staff can select (for payout fulfillment)
CREATE POLICY "payout_methods_seller_select"
  ON public.seller_payout_methods
  FOR SELECT
  TO authenticated
  USING (
    seller_id = (select auth.uid()) OR is_staff()
  );

CREATE POLICY "payout_methods_seller_insert"
  ON public.seller_payout_methods
  FOR INSERT
  TO authenticated
  WITH CHECK (
    seller_id = (select auth.uid())
  );

CREATE POLICY "payout_methods_seller_update"
  ON public.seller_payout_methods
  FOR UPDATE
  TO authenticated
  USING (seller_id = (select auth.uid()))
  WITH CHECK (seller_id = (select auth.uid()));

CREATE POLICY "payout_methods_seller_delete"
  ON public.seller_payout_methods
  FOR DELETE
  TO authenticated
  USING (seller_id = (select auth.uid()));

-- Staff Actions: Selectable only by staff/admin; No client inserts/updates/deletes
CREATE POLICY "staff_actions_select_staff"
  ON public.staff_actions
  FOR SELECT
  TO authenticated
  USING (is_staff());
