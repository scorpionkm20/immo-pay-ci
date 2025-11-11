-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lease_id UUID NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  montant NUMERIC NOT NULL,
  mois_paiement DATE NOT NULL,
  date_paiement TIMESTAMP WITH TIME ZONE DEFAULT now(),
  statut TEXT NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'en_cours', 'reussi', 'echoue')),
  methode_paiement TEXT NOT NULL CHECK (methode_paiement IN ('orange_money', 'mtn_money', 'moov_money', 'wave')),
  numero_telephone TEXT NOT NULL,
  transaction_id TEXT,
  recu_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payments
CREATE POLICY "Locataires can view their own payments"
  ON public.payments
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT locataire_id FROM public.leases WHERE id = payments.lease_id
    )
  );

CREATE POLICY "Gestionnaires can view payments for their properties"
  ON public.payments
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT gestionnaire_id FROM public.leases WHERE id = payments.lease_id
    )
  );

CREATE POLICY "Locataires can create their own payments"
  ON public.payments
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT locataire_id FROM public.leases WHERE id = payments.lease_id
    )
  );

CREATE POLICY "System can update payments"
  ON public.payments
  FOR UPDATE
  USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_payments_lease_id ON public.payments(lease_id);
CREATE INDEX idx_payments_statut ON public.payments(statut);
CREATE INDEX idx_payments_mois_paiement ON public.payments(mois_paiement);