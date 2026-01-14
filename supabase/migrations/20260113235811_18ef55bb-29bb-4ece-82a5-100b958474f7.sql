-- Enum pour le statut de paiement des baux (Côte d'Ivoire)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lease_payment_status') THEN
    CREATE TYPE public.lease_payment_status AS ENUM ('pending', 'awaiting_tenant_confirmation', 'verified', 'overdue');
  END IF;
END $$;

-- Ajouter les colonnes pour le modèle Côte d'Ivoire aux baux
ALTER TABLE public.leases 
ADD COLUMN IF NOT EXISTS advance_months_count integer DEFAULT 2,
ADD COLUMN IF NOT EXISTS caution_months_count integer DEFAULT 2,
ADD COLUMN IF NOT EXISTS agency_months_count integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS receipt_url text,
ADD COLUMN IF NOT EXISTS receipt_uploaded_at timestamptz,
ADD COLUMN IF NOT EXISTS receipt_uploaded_by uuid,
ADD COLUMN IF NOT EXISTS tenant_confirmed_at timestamptz,
ADD COLUMN IF NOT EXISTS contract_generated_at timestamptz,
ADD COLUMN IF NOT EXISTS first_regular_payment_date date,
ADD COLUMN IF NOT EXISTS advance_months_consumed integer DEFAULT 0;

-- Table pour le suivi des rappels de paiement
CREATE TABLE IF NOT EXISTS public.lease_payment_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id uuid REFERENCES public.leases(id) ON DELETE CASCADE NOT NULL,
  reminder_type text NOT NULL, -- 'advance_ending', 'courtesy', 'deadline', 'overdue'
  reminder_date date NOT NULL,
  sent_at timestamptz,
  acknowledged_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(lease_id, reminder_type, reminder_date)
);

-- Activer RLS sur la table des rappels
ALTER TABLE public.lease_payment_reminders ENABLE ROW LEVEL SECURITY;

-- Politique RLS pour les rappels
CREATE POLICY "Users can view their own reminders" ON public.lease_payment_reminders
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.leases l
    WHERE l.id = lease_payment_reminders.lease_id
    AND (l.locataire_id = auth.uid() OR l.gestionnaire_id = auth.uid())
  )
);

CREATE POLICY "Managers can manage reminders" ON public.lease_payment_reminders
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.leases l
    WHERE l.id = lease_payment_reminders.lease_id
    AND l.gestionnaire_id = auth.uid()
  )
);

-- Ajouter des index pour les performances
CREATE INDEX IF NOT EXISTS idx_leases_payment_status ON public.leases(payment_status);
CREATE INDEX IF NOT EXISTS idx_leases_first_regular_payment_date ON public.leases(first_regular_payment_date);
CREATE INDEX IF NOT EXISTS idx_lease_reminders_lease ON public.lease_payment_reminders(lease_id);
CREATE INDEX IF NOT EXISTS idx_lease_reminders_date ON public.lease_payment_reminders(reminder_date);

-- Bucket de stockage pour les reçus de paiement
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-receipts', 'payment-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- RLS pour le bucket des reçus
CREATE POLICY "Managers can upload receipts" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'payment-receipts' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can view their receipts" ON storage.objects
FOR SELECT USING (
  bucket_id = 'payment-receipts'
  AND auth.role() = 'authenticated'
);

-- Activer realtime sur les leases pour les mises à jour
ALTER PUBLICATION supabase_realtime ADD TABLE public.lease_payment_reminders;