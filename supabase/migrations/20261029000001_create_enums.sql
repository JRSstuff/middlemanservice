-- 00001_create_enums.sql
-- Enums for SafeSwap Transaction Flow and Permissions

CREATE TYPE deal_status AS ENUM (
  'CREATED',     -- Deal created, terms shown, awaiting funding
  'FUNDED',      -- Buyer submitted payment, awaiting escrow partner confirmation
  'HELD',        -- Escrow partner confirmed funds hold. Seller CANNOT withdraw.
  'DELIVERED',   -- Seller marked delivered + optional proof
  'CONFIRMED',   -- Buyer confirmed receipt, funds disbursed to seller minus fee
  'DISPUTED',    -- Either party contested the deal; admin review required
  'CANCELLED',   -- Cancelled prior to hold or refunded before fulfillment
  'REFUNDED',    -- Funds returned to buyer (post dispute or failure)
  'EXPIRED'      -- Expired automatically via TTL review window
);

CREATE TYPE user_role AS ENUM (
  'buyer',
  'seller',
  'admin'
);

CREATE TYPE proof_type AS ENUM (
  'photo',
  'file',
  'tracking_number',
  'notes'
);

CREATE TYPE dispute_status AS ENUM (
  'open',
  'under_review',
  'resolved_buyer',
  'resolved_seller'
);
