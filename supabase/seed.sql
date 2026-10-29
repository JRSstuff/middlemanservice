-- SafeSwap Local Seed Data
-- Provides test accounts and mock escrow deals in various lifecycle states

-- 1. Create Mock Auth Users (if auth.users exists in local supabase)
DO $$
DECLARE
  v_buyer_id UUID := '00000000-0000-0000-0000-000000000001';
  v_seller_id UUID := '00000000-0000-0000-0000-000000000002';
  v_admin_id UUID := '00000000-0000-0000-0000-000000000003';
  v_deal1_id UUID := '11111111-1111-1111-1111-111111111111';
  v_deal2_id UUID := '22222222-2222-2222-2222-222222222222';
  v_deal3_id UUID := '33333333-3333-3333-3333-333333333333';
BEGIN
  -- Insert into auth.users if running in Supabase local environment
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, raw_app_meta_data)
    VALUES
      (v_buyer_id, 'buyer@safeswap.dev', crypt('Password123!', gen_salt('bf')), now(), '{"display_name": "Buyer Alex"}'::jsonb, '{"role": "buyer"}'::jsonb),
      (v_seller_id, 'seller@safeswap.dev', crypt('Password123!', gen_salt('bf')), now(), '{"display_name": "Seller Maria"}'::jsonb, '{"role": "seller"}'::jsonb),
      (v_admin_id, 'admin@safeswap.dev', crypt('Password123!', gen_salt('bf')), now(), '{"display_name": "Admin Support"}'::jsonb, '{"role": "admin"}'::jsonb)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Insert Profiles
  INSERT INTO public.profiles (id, email, display_name, role)
  VALUES
    (v_buyer_id, 'buyer@safeswap.dev', 'Buyer Alex', 'buyer'),
    (v_seller_id, 'seller@safeswap.dev', 'Seller Maria', 'seller'),
    (v_admin_id, 'admin@safeswap.dev', 'Admin Support', 'admin')
  ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    role = EXCLUDED.role;

  -- 2. Deal 1: HELD (Funds Protected in Escrow)
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
    525000,   -- 5,250.00 PHP (3% service fee)
    'mock_pay_sess_held_001',
    timezone('utc', now() + interval '3 days')
  ) ON CONFLICT (id) DO NOTHING;

  -- Timeline for Deal 1
  INSERT INTO public.deal_timeline (deal_id, actor_id, from_status, to_status, action, note)
  VALUES
    (v_deal1_id, v_seller_id, NULL, 'CREATED', 'Deal Created', 'Seller created transaction terms'),
    (v_deal1_id, v_buyer_id, 'CREATED', 'FUNDED', 'Payment Initiated', 'Buyer funded ₱175,000.00 via mock provider'),
    (v_deal1_id, NULL, 'FUNDED', 'HELD', 'Funds Protected', 'Regulated partner confirmed funds hold in escrow vault')
  ON CONFLICT DO NOTHING;

  -- 3. Deal 2: DELIVERED (Awaiting Buyer Confirmation)
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
    1440000,  -- 14,400.00 PHP (2% service fee)
    'mock_pay_sess_deliv_002',
    timezone('utc', now() - interval '4 hours'),
    timezone('utc', now() + interval '44 hours')
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.deal_timeline (deal_id, actor_id, from_status, to_status, action, note)
  VALUES
    (v_deal2_id, v_buyer_id, NULL, 'CREATED', 'Deal Created', 'Deal created by buyer'),
    (v_deal2_id, v_buyer_id, 'CREATED', 'FUNDED', 'Buyer Paid', 'Payment received'),
    (v_deal2_id, NULL, 'FUNDED', 'HELD', 'Escrow Secured', 'Escrow holding confirmed'),
    (v_deal2_id, v_seller_id, 'HELD', 'DELIVERED', 'Delivered via Armored Courier', 'Air21 Vault tracking: #AR-99321')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.delivery_proofs (deal_id, seller_id, proof_type, tracking_number, carrier, notes)
  VALUES (
    v_deal2_id, v_seller_id, 'tracking_number', 'AR-99321', 'Air21 Armored', 'Delivered to recipient safe deposit branch.'
  ) ON CONFLICT DO NOTHING;

  -- 4. Deal 3: CREATED (Awaiting Buyer Payment)
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
    150000,  -- 1,500.00 PHP (3%)
    timezone('utc', now() + interval '5 days')
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.deal_timeline (deal_id, actor_id, from_status, to_status, action, note)
  VALUES
    (v_deal3_id, v_seller_id, NULL, 'CREATED', 'Milestone Deal Created', 'Terms submitted for buyer review')
  ON CONFLICT DO NOTHING;

END $$;
