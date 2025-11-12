-- Table pour les charges de propriété
CREATE TABLE IF NOT EXISTS public.property_charges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES public.management_spaces(id) ON DELETE CASCADE,
  type_charge TEXT NOT NULL, -- taxe_fonciere, assurance, entretien, travaux, charges_copropriete, autre
  montant NUMERIC NOT NULL,
  date_charge DATE NOT NULL,
  description TEXT,
  recurrent BOOLEAN NOT NULL DEFAULT false,
  frequence TEXT, -- mensuel, trimestriel, annuel
  facture_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour l'amortissement des biens
CREATE TABLE IF NOT EXISTS public.property_amortization (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES public.management_spaces(id) ON DELETE CASCADE,
  valeur_acquisition NUMERIC NOT NULL,
  date_acquisition DATE NOT NULL,
  duree_amortissement INTEGER NOT NULL DEFAULT 20, -- en années
  valeur_residuelle NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(property_id)
);

-- Table pour les relances de paiement
CREATE TABLE IF NOT EXISTS public.payment_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES public.management_spaces(id) ON DELETE CASCADE,
  type_relance TEXT NOT NULL, -- premier_rappel, deuxieme_rappel, mise_en_demeure
  date_relance TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  message TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'envoye', -- envoye, lu, ignore
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_property_charges_property ON public.property_charges(property_id);
CREATE INDEX idx_property_charges_space ON public.property_charges(space_id);
CREATE INDEX idx_property_charges_date ON public.property_charges(date_charge);
CREATE INDEX idx_property_amortization_property ON public.property_amortization(property_id);
CREATE INDEX idx_payment_reminders_payment ON public.payment_reminders(payment_id);
CREATE INDEX idx_payment_reminders_space ON public.payment_reminders(space_id);

-- Enable RLS
ALTER TABLE public.property_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_amortization ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for property_charges
CREATE POLICY "Space gestionnaires can manage charges"
ON public.property_charges
FOR ALL
USING (has_space_role(auth.uid(), space_id, 'gestionnaire'::app_role))
WITH CHECK (has_space_role(auth.uid(), space_id, 'gestionnaire'::app_role));

CREATE POLICY "Space members can view charges"
ON public.property_charges
FOR SELECT
USING (is_space_member(auth.uid(), space_id));

-- RLS Policies for property_amortization
CREATE POLICY "Space gestionnaires can manage amortization"
ON public.property_amortization
FOR ALL
USING (has_space_role(auth.uid(), space_id, 'gestionnaire'::app_role))
WITH CHECK (has_space_role(auth.uid(), space_id, 'gestionnaire'::app_role));

CREATE POLICY "Space members can view amortization"
ON public.property_amortization
FOR SELECT
USING (is_space_member(auth.uid(), space_id));

-- RLS Policies for payment_reminders
CREATE POLICY "Space gestionnaires can manage reminders"
ON public.payment_reminders
FOR ALL
USING (has_space_role(auth.uid(), space_id, 'gestionnaire'::app_role))
WITH CHECK (has_space_role(auth.uid(), space_id, 'gestionnaire'::app_role));

CREATE POLICY "Space members can view reminders"
ON public.payment_reminders
FOR SELECT
USING (is_space_member(auth.uid(), space_id));

-- Triggers for updated_at
CREATE TRIGGER update_property_charges_updated_at
BEFORE UPDATE ON public.property_charges
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_property_amortization_updated_at
BEFORE UPDATE ON public.property_amortization
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();