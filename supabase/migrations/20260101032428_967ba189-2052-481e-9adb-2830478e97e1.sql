-- Table pour configurer les comptes de distribution par espace
CREATE TABLE public.payment_distribution_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id UUID NOT NULL REFERENCES public.management_spaces(id) ON DELETE CASCADE,
  
  -- Compte du propriétaire (reçoit les loyers après commission)
  proprietaire_nom TEXT NOT NULL,
  proprietaire_telephone TEXT NOT NULL,
  proprietaire_operateur TEXT NOT NULL DEFAULT 'orange_money',
  proprietaire_pourcentage NUMERIC NOT NULL DEFAULT 90,
  
  -- Compte du gestionnaire (reçoit commission sur loyers)
  gestionnaire_nom TEXT NOT NULL,
  gestionnaire_telephone TEXT NOT NULL,
  gestionnaire_operateur TEXT NOT NULL DEFAULT 'orange_money',
  gestionnaire_pourcentage NUMERIC NOT NULL DEFAULT 10,
  
  -- Compte du démarcheur/mainteneur (reçoit 1 mois sur caution)
  demarcheur_nom TEXT,
  demarcheur_telephone TEXT,
  demarcheur_operateur TEXT DEFAULT 'orange_money',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  
  CONSTRAINT valid_percentages CHECK (proprietaire_pourcentage + gestionnaire_pourcentage = 100),
  CONSTRAINT valid_proprietaire_pourcentage CHECK (proprietaire_pourcentage >= 0 AND proprietaire_pourcentage <= 100),
  CONSTRAINT valid_gestionnaire_pourcentage CHECK (gestionnaire_pourcentage >= 0 AND gestionnaire_pourcentage <= 100),
  UNIQUE(space_id)
);

-- Table pour l'historique des distributions de paiements
CREATE TABLE public.payment_distributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES public.management_spaces(id) ON DELETE CASCADE,
  
  -- Type de distribution (caution ou loyer)
  type_distribution TEXT NOT NULL CHECK (type_distribution IN ('caution', 'loyer')),
  
  -- Détails de la distribution
  montant_total NUMERIC NOT NULL,
  
  -- Part propriétaire
  montant_proprietaire NUMERIC NOT NULL DEFAULT 0,
  telephone_proprietaire TEXT,
  operateur_proprietaire TEXT,
  statut_proprietaire TEXT NOT NULL DEFAULT 'en_attente',
  transaction_id_proprietaire TEXT,
  
  -- Part gestionnaire
  montant_gestionnaire NUMERIC NOT NULL DEFAULT 0,
  telephone_gestionnaire TEXT,
  operateur_gestionnaire TEXT,
  statut_gestionnaire TEXT NOT NULL DEFAULT 'en_attente',
  transaction_id_gestionnaire TEXT,
  
  -- Part démarcheur (uniquement pour caution)
  montant_demarcheur NUMERIC DEFAULT 0,
  telephone_demarcheur TEXT,
  operateur_demarcheur TEXT,
  statut_demarcheur TEXT DEFAULT 'en_attente',
  transaction_id_demarcheur TEXT,
  
  -- Détail de la répartition de la caution (5 mois)
  detail_caution JSONB,
  
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_distribution_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_distributions ENABLE ROW LEVEL SECURITY;

-- RLS policies for payment_distribution_config
CREATE POLICY "Space gestionnaires can manage distribution config"
  ON public.payment_distribution_config
  FOR ALL
  USING (has_space_role(auth.uid(), space_id, 'gestionnaire'))
  WITH CHECK (has_space_role(auth.uid(), space_id, 'gestionnaire'));

CREATE POLICY "Space members can view distribution config"
  ON public.payment_distribution_config
  FOR SELECT
  USING (is_space_member(auth.uid(), space_id));

-- RLS policies for payment_distributions
CREATE POLICY "Space gestionnaires can manage distributions"
  ON public.payment_distributions
  FOR ALL
  USING (has_space_role(auth.uid(), space_id, 'gestionnaire'))
  WITH CHECK (has_space_role(auth.uid(), space_id, 'gestionnaire'));

CREATE POLICY "Space members can view distributions"
  ON public.payment_distributions
  FOR SELECT
  USING (is_space_member(auth.uid(), space_id));

-- Trigger pour updated_at
CREATE TRIGGER update_payment_distribution_config_updated_at
  BEFORE UPDATE ON public.payment_distribution_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_distributions_updated_at
  BEFORE UPDATE ON public.payment_distributions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();