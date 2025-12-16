-- Fix RLS: allow tenants to create payments for their own leases (used by initiate-payment function)

-- Ensure RLS is enabled
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create INSERT policy (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'payments'
      AND policyname = 'Tenants can create payments for own leases'
  ) THEN
    CREATE POLICY "Tenants can create payments for own leases"
    ON public.payments
    FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.leases l
        WHERE l.id = payments.lease_id
          AND l.locataire_id = auth.uid()
          AND l.space_id = payments.space_id
      )
    );
  END IF;
END $$;

-- (Optional but helpful) allow tenants to update their own payment details while pending/en_cours
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'payments'
      AND policyname = 'Tenants can update own pending payments'
  ) THEN
    CREATE POLICY "Tenants can update own pending payments"
    ON public.payments
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1
        FROM public.leases l
        WHERE l.id = payments.lease_id
          AND l.locataire_id = auth.uid()
      )
      AND payments.statut IN ('en_attente', 'en_cours')
    )
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.leases l
        WHERE l.id = payments.lease_id
          AND l.locataire_id = auth.uid()
          AND l.space_id = payments.space_id
      )
    );
  END IF;
END $$;