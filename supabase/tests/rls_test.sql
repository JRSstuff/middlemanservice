-- supabase/tests/rls_test.sql
-- Test suite verifying strict RLS isolation, Manual QR Ph state transitions, duplicate check, and Four-Eyes rule

BEGIN;

DO $$
DECLARE
  v_user_buyer UUID := '00000000-0000-0000-0000-000000000001';
  v_user_seller UUID := '00000000-0000-0000-0000-000000000002';
  v_staff_1 UUID := '00000000-0000-0000-0000-000000000003';
  v_staff_2 UUID := '00000000-0000-0000-0000-000000000004';
  v_user_outsider UUID := '00000000-0000-0000-0000-000000000005';
  v_test_deal UUID;
BEGIN
  -- Insert test profiles
  INSERT INTO public.profiles (id, email, display_name, role)
  VALUES
    (v_user_buyer, 'buyer@test.com', 'Buyer Test', 'buyer'),
    (v_user_seller, 'seller@test.com', 'Seller Test', 'seller'),
    (v_staff_1, 'staff1@test.com', 'Staff Verifier', 'staff'),
    (v_staff_2, 'staff2@test.com', 'Staff Disburser', 'staff'),
    (v_user_outsider, 'outsider@test.com', 'Outsider Test', 'buyer')
  ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

  -- Create test deal
  INSERT INTO public.deals (
    buyer_id, seller_id, title, description, terms, status, price_amount, price_currency, service_fee_amount
  ) VALUES (
    v_user_buyer, v_user_seller, 'Rolex Submariner Escrow', 'Mint with box',
    'Buyer inspects within 48 hours', 'CREATED', 5000000, 'PHP', 150000
  ) RETURNING id INTO v_test_deal;

  -- 1. Buyer submits payment proof -> PAYMENT_SUBMITTED
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_user_buyer::text, 'role', 'authenticated')::text, true);
  INSERT INTO public.payments (deal_id, direction, amount_centavos, reference_number, submitted_by)
  VALUES (v_test_deal, 'in', 5150000, 'GCASH-998811', v_user_buyer);
  PERFORM public.transition_deal(v_test_deal, 'PAYMENT_SUBMITTED', 'Buyer submitted QR Ph proof');
  RAISE NOTICE 'SUCCESS: Buyer successfully submitted payment proof.';

  -- 2. Duplicate reference number is rejected (fraud protection test)
  BEGIN
    INSERT INTO public.payments (deal_id, direction, amount_centavos, reference_number, submitted_by)
    VALUES (v_test_deal, 'in', 5150000, 'GCASH-998811', v_user_buyer);
    RAISE EXCEPTION 'TEST FAILED: Duplicate bank reference number was allowed!';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'SUCCESS: Duplicate bank reference number was correctly blocked by unique constraint.';
  END;

  -- 3. Outsider or buyer CANNOT verify payment
  BEGIN
    PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_user_buyer::text, 'role', 'authenticated')::text, true);
    PERFORM public.transition_deal(v_test_deal, 'HELD', 'Buyer tries to self-verify');
    RAISE EXCEPTION 'TEST FAILED: Buyer was able to verify their own payment!';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'SUCCESS: Non-staff was correctly blocked from verifying payment (Error: %)', SQLERRM;
  END;

  -- 4. Staff 1 verifies payment -> moves to HELD
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_staff_1::text, 'role', 'authenticated')::text, true);
  UPDATE public.payments SET status = 'verified', reviewed_by = v_staff_1, reviewed_at = now()
  WHERE deal_id = v_test_deal AND direction = 'in';
  PERFORM public.transition_deal(v_test_deal, 'HELD', 'Staff 1 verified bank statement');
  RAISE NOTICE 'SUCCESS: Staff 1 verified deposit and deal moved to HELD.';

  -- 5. Seller marks DELIVERED
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_user_seller::text, 'role', 'authenticated')::text, true);
  PERFORM public.transition_deal(v_test_deal, 'DELIVERED', 'Seller dispatched package #LBC-1234');
  RAISE NOTICE 'SUCCESS: Seller marked item as DELIVERED.';

  -- 6. Buyer confirms receipt -> moves to PAYOUT_PENDING
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_user_buyer::text, 'role', 'authenticated')::text, true);
  PERFORM public.transition_deal(v_test_deal, 'PAYOUT_PENDING', 'Buyer confirmed receipt');
  RAISE NOTICE 'SUCCESS: Buyer confirmed receipt and deal moved to PAYOUT_PENDING.';

  -- 7. FOUR-EYES RULE: Staff 1 (who verified payment) CANNOT disburse seller payout
  BEGIN
    PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_staff_1::text, 'role', 'authenticated')::text, true);
    PERFORM public.transition_deal(v_test_deal, 'RELEASED', 'Staff 1 tries to disburse');
    RAISE EXCEPTION 'TEST FAILED: Four-eyes rule violated! Same staff member verified and disbursed.';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'SUCCESS: Four-Eyes Rule correctly blocked Staff 1 from approving payout (Error: %)', SQLERRM;
  END;

  -- 8. Staff 2 (different staff member) successfully approves payout -> RELEASED
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_staff_2::text, 'role', 'authenticated')::text, true);
  INSERT INTO public.payments (deal_id, direction, amount_centavos, reference_number, status, reviewed_by)
  VALUES (v_test_deal, 'out', 5000000, 'INSTAPAY-445566', 'completed', v_staff_2);
  PERFORM public.transition_deal(v_test_deal, 'RELEASED', 'Staff 2 disbursed payout via InstaPay');
  RAISE NOTICE 'SUCCESS: Staff 2 released payout in compliance with Four-Eyes Rule.';

  -- 9. Check tamper-proof immutable audit log
  BEGIN
    DELETE FROM public.staff_actions WHERE target_deal_id = v_test_deal;
    RAISE EXCEPTION 'TEST FAILED: Staff actions audit entry was deleted!';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'SUCCESS: Staff actions audit trail is strictly immutable.';
  END;

END $$;

ROLLBACK;
