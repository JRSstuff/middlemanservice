-- 00008_create_rls_policies.sql
-- Strict Row Level Security (RLS) on EVERY table

-- Enable RLS across all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- Helper functions for RLS checks (marked STABLE for planner optimization)
-- -----------------------------------------------------------------------------

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

-- -----------------------------------------------------------------------------
-- 1. PROFILES POLICIES
-- -----------------------------------------------------------------------------

-- Anyone authenticated can view profiles (to display counterparty names/avatars)
CREATE POLICY "profiles_select_all"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can only update their own profile (display_name, avatar, phone)
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- -----------------------------------------------------------------------------
-- 2. DEALS POLICIES (Strict: Never allow client to write status or money)
-- -----------------------------------------------------------------------------

-- Participants and Admins can READ their deals
CREATE POLICY "deals_select_participant"
  ON public.deals
  FOR SELECT
  TO authenticated
  USING (
    (buyer_id = (select auth.uid())) OR 
    (seller_id = (select auth.uid())) OR
    is_admin()
  );

-- Authenticated users can CREATE a deal where they are either buyer or seller
-- Initial status MUST be 'CREATED'
CREATE POLICY "deals_insert_participant"
  ON public.deals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    ((buyer_id = (select auth.uid())) OR (seller_id = (select auth.uid()))) AND
    status = 'CREATED'
  );

-- Users CANNOT update deals directly once created (money & status are protected).
-- Only allowed to update title/description while still CREATED and before funding.
CREATE POLICY "deals_update_created_only"
  ON public.deals
  FOR UPDATE
  TO authenticated
  USING (
    ((buyer_id = (select auth.uid())) OR (seller_id = (select auth.uid()))) AND
    status = 'CREATED'
  )
  WITH CHECK (
    ((buyer_id = (select auth.uid())) OR (seller_id = (select auth.uid()))) AND
    status = 'CREATED'
  );

-- DELETION is disallowed for integrity
CREATE POLICY "deals_delete_disallowed"
  ON public.deals
  FOR DELETE
  TO authenticated
  USING (false);

-- -----------------------------------------------------------------------------
-- 3. DEAL TIMELINE POLICIES
-- -----------------------------------------------------------------------------

CREATE POLICY "timeline_select_participant"
  ON public.deal_timeline
  FOR SELECT
  TO authenticated
  USING (
    is_deal_participant(deal_id) OR is_admin()
  );

-- Direct client inserts/updates/deletes are disallowed (all written via transition_deal)
CREATE POLICY "timeline_no_client_insert"
  ON public.deal_timeline
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "timeline_no_client_update"
  ON public.deal_timeline
  FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "timeline_no_client_delete"
  ON public.deal_timeline
  FOR DELETE
  TO authenticated
  USING (false);

-- -----------------------------------------------------------------------------
-- 4. AUDIT LOG POLICIES (Append-only, Read restricted)
-- -----------------------------------------------------------------------------

CREATE POLICY "audit_log_select_participant"
  ON public.audit_log
  FOR SELECT
  TO authenticated
  USING (
    is_deal_participant(deal_id) OR is_admin()
  );

-- All client writes disallowed; written strictly by SECURITY DEFINER functions
CREATE POLICY "audit_log_no_client_insert"
  ON public.audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "audit_log_no_client_update"
  ON public.audit_log
  FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "audit_log_no_client_delete"
  ON public.audit_log
  FOR DELETE
  TO authenticated
  USING (false);

-- -----------------------------------------------------------------------------
-- 5. DELIVERY PROOFS POLICIES
-- -----------------------------------------------------------------------------

CREATE POLICY "delivery_proofs_select_participant"
  ON public.delivery_proofs
  FOR SELECT
  TO authenticated
  USING (
    is_deal_participant(deal_id) OR is_admin()
  );

-- Seller can insert delivery proof for HELD or DELIVERED deals
CREATE POLICY "delivery_proofs_insert_seller"
  ON public.delivery_proofs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    seller_id = (select auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.deals
      WHERE id = deal_id AND seller_id = (select auth.uid())
    )
  );

-- -----------------------------------------------------------------------------
-- 6. DISPUTES & EVIDENCE POLICIES
-- -----------------------------------------------------------------------------

CREATE POLICY "disputes_select_participant"
  ON public.disputes
  FOR SELECT
  TO authenticated
  USING (
    is_deal_participant(deal_id) OR is_admin()
  );

CREATE POLICY "disputes_insert_participant"
  ON public.disputes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    raised_by = (select auth.uid()) AND
    is_deal_participant(deal_id)
  );

CREATE POLICY "dispute_evidence_select_participant"
  ON public.dispute_evidence
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.disputes d
      WHERE d.id = dispute_id AND (is_deal_participant(d.deal_id) OR is_admin())
    )
  );

CREATE POLICY "dispute_evidence_insert_participant"
  ON public.dispute_evidence
  FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = (select auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.disputes d
      WHERE d.id = dispute_id AND (is_deal_participant(d.deal_id) OR is_admin())
    )
  );

-- -----------------------------------------------------------------------------
-- 7. WEBHOOK EVENTS POLICIES (Private: service_role only)
-- -----------------------------------------------------------------------------

-- Authenticated and anon users cannot see or modify webhook events
CREATE POLICY "webhooks_service_role_only"
  ON public.webhook_events
  FOR ALL
  TO authenticated
  USING (is_admin());

-- -----------------------------------------------------------------------------
-- 8. NOTIFICATIONS POLICIES
-- -----------------------------------------------------------------------------

CREATE POLICY "notifications_select_own"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "notifications_update_own"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
