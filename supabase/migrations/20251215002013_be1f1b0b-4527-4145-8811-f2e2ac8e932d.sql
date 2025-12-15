
-- Fonction pour notifier le propriétaire lors d'un paiement reçu
CREATE OR REPLACE FUNCTION public.notify_owner_payment_received()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_lease RECORD;
  v_property RECORD;
  v_owner_id UUID;
  v_tenant_name TEXT;
BEGIN
  -- Seulement si le statut passe à 'valide'
  IF (TG_OP = 'UPDATE' AND OLD.statut != 'valide' AND NEW.statut = 'valide') THEN
    -- Récupérer le bail
    SELECT * INTO v_lease FROM public.leases WHERE id = NEW.lease_id;
    
    IF v_lease IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Récupérer la propriété
    SELECT * INTO v_property FROM public.properties WHERE id = v_lease.property_id;
    
    IF v_property IS NULL OR v_property.proprietaire_id IS NULL THEN
      RETURN NEW;
    END IF;
    
    v_owner_id := v_property.proprietaire_id;
    
    -- Récupérer le nom du locataire
    SELECT full_name INTO v_tenant_name FROM public.profiles WHERE user_id = v_lease.locataire_id;
    
    -- Vérifier les préférences de notification
    IF public.should_notify(v_owner_id, 'paiement_recu') THEN
      INSERT INTO public.notifications (user_id, lease_id, type, titre, message)
      VALUES (
        v_owner_id,
        NEW.lease_id,
        'paiement_recu',
        'Loyer perçu',
        'Le loyer de ' || NEW.montant || ' FCFA pour "' || v_property.titre || '" a été payé par ' || COALESCE(v_tenant_name, 'le locataire')
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fonction pour notifier le propriétaire lors d'un retard de paiement
CREATE OR REPLACE FUNCTION public.notify_owner_payment_overdue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_lease RECORD;
  v_property RECORD;
  v_owner_id UUID;
  v_tenant_name TEXT;
  v_days_overdue INTEGER;
BEGIN
  -- Seulement pour les paiements en attente dont la date est passée
  IF NEW.statut = 'en_attente' AND NEW.mois_paiement < CURRENT_DATE THEN
    v_days_overdue := CURRENT_DATE - NEW.mois_paiement;
    
    -- Ne notifier que si le retard est significatif (5, 10, 15, 30 jours)
    IF v_days_overdue NOT IN (5, 10, 15, 30) THEN
      RETURN NEW;
    END IF;
    
    -- Récupérer le bail
    SELECT * INTO v_lease FROM public.leases WHERE id = NEW.lease_id;
    
    IF v_lease IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Récupérer la propriété
    SELECT * INTO v_property FROM public.properties WHERE id = v_lease.property_id;
    
    IF v_property IS NULL OR v_property.proprietaire_id IS NULL THEN
      RETURN NEW;
    END IF;
    
    v_owner_id := v_property.proprietaire_id;
    
    -- Récupérer le nom du locataire
    SELECT full_name INTO v_tenant_name FROM public.profiles WHERE user_id = v_lease.locataire_id;
    
    -- Vérifier les préférences de notification
    IF public.should_notify(v_owner_id, 'retard_paiement') THEN
      INSERT INTO public.notifications (user_id, lease_id, type, titre, message)
      VALUES (
        v_owner_id,
        NEW.lease_id,
        'retard_paiement',
        'Loyer en retard',
        'Le loyer de ' || NEW.montant || ' FCFA pour "' || v_property.titre || '" est en retard de ' || v_days_overdue || ' jours. Locataire: ' || COALESCE(v_tenant_name, 'Non spécifié')
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Créer les triggers
DROP TRIGGER IF EXISTS notify_owner_on_payment_received ON public.payments;
CREATE TRIGGER notify_owner_on_payment_received
  AFTER UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_owner_payment_received();

DROP TRIGGER IF EXISTS notify_owner_on_payment_overdue ON public.payments;
CREATE TRIGGER notify_owner_on_payment_overdue
  AFTER INSERT OR UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_owner_payment_overdue();
