-- 00003_create_deals.sql
-- Escrow Deals table storing reference values, state, and transaction participants

CREATE TABLE IF NOT EXISTS public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  title TEXT NOT NULL CHECK (char_length(title) >= 3 AND char_length(title) <= 200),
  description TEXT CHECK (char_length(description) <= 2000),
  terms TEXT NOT NULL CHECK (char_length(terms) >= 10),
  status deal_status NOT NULL DEFAULT 'CREATED',
  
  -- Money stored in MINOR UNITS (integers: e.g. centavos / cents), NEVER floats
  price_amount BIGINT NOT NULL CHECK (price_amount > 0),
  price_currency TEXT NOT NULL DEFAULT 'PHP' CHECK (char_length(price_currency) = 3),
  service_fee_amount BIGINT NOT NULL DEFAULT 0 CHECK (service_fee_amount >= 0),
  
  -- Regulated Escrow Partner references (we never hold or move money ourselves)
  payment_provider_ref TEXT,
  payment_session_id TEXT,
  
  -- Deadlines and Timestamps
  expires_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),

  -- Ensure buyer and seller are distinct users
  CONSTRAINT check_distinct_participants CHECK (buyer_id <> seller_id)
);

-- Common query indexes for performance
CREATE INDEX idx_deals_buyer_status ON public.deals(buyer_id, status);
CREATE INDEX idx_deals_seller_status ON public.deals(seller_id, status);
CREATE INDEX idx_deals_status_expires ON public.deals(status, expires_at);
CREATE INDEX idx_deals_created_at ON public.deals(created_at DESC);

-- Automatic updated_at trigger
CREATE TRIGGER on_deals_updated
  BEFORE UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
