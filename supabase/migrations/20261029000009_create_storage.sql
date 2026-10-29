-- 00009_create_storage.sql
-- Private storage bucket for SafeSwap Delivery Proofs & Dispute Evidence

-- 1. Create private bucket 'safeswap-evidence' (public = false)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'safeswap-evidence',
  'safeswap-evidence',
  false,
  10485760, -- 10MB limit per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- 2. Storage RLS policies
-- Objects path convention: {deal_id}/{proof_or_dispute}/{filename}

-- Select / Download signed URL policy: Only deal participants or admins
CREATE POLICY "evidence_storage_select_participant"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'safeswap-evidence' AND
    (
      public.is_admin() OR
      EXISTS (
        SELECT 1 FROM public.deals
        WHERE id::text = (storage.foldername(name))[1]
          AND ((buyer_id = (select auth.uid())) OR (seller_id = (select auth.uid())))
      )
    )
  );

-- Insert / Upload policy: Authenticated participants can upload evidence for their deal
CREATE POLICY "evidence_storage_insert_participant"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'safeswap-evidence' AND
    EXISTS (
      SELECT 1 FROM public.deals
      WHERE id::text = (storage.foldername(name))[1]
        AND ((buyer_id = (select auth.uid())) OR (seller_id = (select auth.uid())))
    )
  );
