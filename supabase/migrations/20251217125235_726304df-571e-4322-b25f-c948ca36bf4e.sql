-- Ajouter la date de paiement de la caution pour calculer quand le loyer commence
ALTER TABLE public.leases 
ADD COLUMN IF NOT EXISTS date_caution_payee timestamp with time zone DEFAULT NULL;

-- Créer un trigger pour mettre à jour la date quand la caution est payée
CREATE OR REPLACE FUNCTION public.update_caution_paid_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Si la caution passe de non payée à payée, enregistrer la date
  IF (OLD.caution_payee IS DISTINCT FROM NEW.caution_payee) AND NEW.caution_payee = true THEN
    NEW.date_caution_payee = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_update_caution_paid_date ON public.leases;
CREATE TRIGGER trigger_update_caution_paid_date
  BEFORE UPDATE ON public.leases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_caution_paid_date();

-- Ajouter un commentaire explicatif sur la structure de la caution
COMMENT ON COLUMN public.leases.caution_montant IS 'Caution totale = 5x loyer mensuel (2 mois avance + 2 mois garantie + 1 mois démarcheur)';