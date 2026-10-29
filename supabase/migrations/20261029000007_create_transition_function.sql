-- 00007_create_transition_function.sql
-- SECURITY DEFINER function to enforce the state machine transition table

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
  v_is_admin BOOLEAN := false;
  v_actor_role TEXT;
  v_allowed BOOLEAN := false;
  v_notify_user UUID;
  v_counterparty_id UUID;
BEGIN
  -- 1. Identify actor and permissions
  v_actor_id := auth.uid();
  
  -- Check if executed via service_role key (Edge Functions)
  IF current_setting('request.jwt.claims', true) IS NOT NULL THEN
    IF (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role' THEN
      v_is_service_role := true;
    END IF;
  END IF;

  -- Check if caller is admin
  IF v_actor_id IS NOT NULL THEN
    SELECT (role = 'admin') INTO v_is_admin FROM public.profiles WHERE id = v_actor_id;
  END IF;

  -- 2. Fetch the target deal
  SELECT * INTO v_deal FROM public.deals WHERE id = p_deal_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deal with id % not found', p_deal_id USING ERRCODE = 'P0002';
  END IF;

  -- 3. Determine actor role relative to this deal
  IF v_is_service_role THEN
    v_actor_role := 'system';
  ELSIF v_is_admin THEN
    v_actor_role := 'admin';
  ELSIF v_actor_id = v_deal.buyer_id THEN
    v_actor_role := 'buyer';
  ELSIF v_actor_id = v_deal.seller_id THEN
    v_actor_role := 'seller';
  ELSE
    RAISE EXCEPTION 'Unauthorized: User % is not a participant in deal %', v_actor_id, p_deal_id USING ERRCODE = '42501';
  END IF;

  -- 4. State Machine Transition Table Validation
  -- CREATED
  IF v_deal.status = 'CREATED' THEN
    IF p_target_status = 'FUNDED' AND (v_actor_role IN ('system', 'admin', 'buyer')) THEN
      v_allowed := true;
    ELSIF p_target_status = 'CANCELLED' AND (v_actor_role IN ('buyer', 'seller', 'admin', 'system')) THEN
      v_allowed := true;
    ELSIF p_target_status = 'EXPIRED' AND (v_actor_role IN ('system', 'admin')) THEN
      v_allowed := true;
    END IF;

  -- FUNDED
  ELSIF v_deal.status = 'FUNDED' THEN
    IF p_target_status = 'HELD' AND (v_actor_role IN ('system', 'admin')) THEN
      v_allowed := true;
    ELSIF p_target_status = 'CANCELLED' AND (v_actor_role IN ('buyer', 'system', 'admin')) THEN
      v_allowed := true;
    END IF;

  -- HELD (Protected by escrow partner)
  ELSIF v_deal.status = 'HELD' THEN
    IF p_target_status = 'DELIVERED' AND (v_actor_role IN ('seller', 'system', 'admin')) THEN
      v_allowed := true;
    ELSIF p_target_status = 'DISPUTED' AND (v_actor_role IN ('buyer', 'seller', 'admin')) THEN
      v_allowed := true;
    ELSIF p_target_status = 'EXPIRED' AND (v_actor_role IN ('system', 'admin')) THEN
      v_allowed := true;
    END IF;

  -- DELIVERED
  ELSIF v_deal.status = 'DELIVERED' THEN
    IF p_target_status = 'CONFIRMED' AND (v_actor_role IN ('buyer', 'system', 'admin')) THEN
      v_allowed := true;
    ELSIF p_target_status = 'DISPUTED' AND (v_actor_role IN ('buyer', 'seller', 'admin')) THEN
      v_allowed := true;
    ELSIF p_target_status = 'EXPIRED' AND (v_actor_role IN ('system', 'admin')) THEN
      v_allowed := true;
    END IF;

  -- DISPUTED (Only Admin can resolve disputes)
  ELSIF v_deal.status = 'DISPUTED' THEN
    IF p_target_status = 'CONFIRMED' AND (v_actor_role IN ('admin', 'system')) THEN
      v_allowed := true;
    ELSIF p_target_status = 'REFUNDED' AND (v_actor_role IN ('admin', 'system')) THEN
      v_allowed := true;
    END IF;

  -- EXPIRED
  ELSIF v_deal.status = 'EXPIRED' THEN
    IF p_target_status = 'CONFIRMED' AND (v_actor_role IN ('system', 'admin')) THEN
      v_allowed := true;
    ELSIF p_target_status = 'REFUNDED' AND (v_actor_role IN ('system', 'admin')) THEN
      v_allowed := true;
    END IF;
  END IF;

  -- Reject if not allowed
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Illegal state transition: Cannot move deal from % to % as %', 
      v_deal.status, p_target_status, v_actor_role USING ERRCODE = 'P0001';
  END IF;

  -- 5. Perform the status update on deals
  UPDATE public.deals
  SET
    status = p_target_status,
    delivered_at = CASE WHEN p_target_status = 'DELIVERED' THEN timezone('utc', now()) ELSE delivered_at END,
    confirmed_at = CASE WHEN p_target_status = 'CONFIRMED' THEN timezone('utc', now()) ELSE confirmed_at END,
    payment_provider_ref = COALESCE(p_metadata->>'payment_provider_ref', payment_provider_ref),
    updated_at = timezone('utc', now())
  WHERE id = p_deal_id;

  -- 6. Insert timeline entry
  INSERT INTO public.deal_timeline (deal_id, actor_id, from_status, to_status, action, note)
  VALUES (p_deal_id, v_actor_id, v_deal.status, p_target_status, p_action, p_note);

  -- 7. Insert immutable audit log
  INSERT INTO public.audit_log (deal_id, actor_id, from_status, to_status, reason, metadata)
  VALUES (
    p_deal_id,
    v_actor_id,
    v_deal.status,
    p_target_status,
    COALESCE(p_note, p_action),
    jsonb_build_object(
      'actor_role', v_actor_role,
      'ip', current_setting('request.headers', true)::jsonb->>'x-forwarded-for',
      'extra', p_metadata
    )
  );

  -- 8. Trigger in-app notification for the counterparty
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
  ELSIF v_actor_role IN ('admin', 'system') THEN
    -- Notify both parties
    INSERT INTO public.notifications (user_id, deal_id, type, title, body)
    VALUES
      (v_deal.buyer_id, p_deal_id, 'STATUS_CHANGE', 'Deal Update: ' || p_target_status::text, p_action),
      (v_deal.seller_id, p_deal_id, 'STATUS_CHANGE', 'Deal Update: ' || p_target_status::text, p_action);
  END IF;

  -- 9. Return the updated deal record
  SELECT to_jsonb(d) INTO v_deal FROM public.deals d WHERE d.id = p_deal_id;
  RETURN v_deal;
END;
$$;
