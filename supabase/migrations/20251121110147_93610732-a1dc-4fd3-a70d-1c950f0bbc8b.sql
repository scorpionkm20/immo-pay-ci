-- Créer la table des demandes de location
CREATE TABLE IF NOT EXISTS public.rental_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  manager_id UUID NOT NULL,
  space_id UUID NOT NULL REFERENCES public.management_spaces(id) ON DELETE CASCADE,
  request_status TEXT NOT NULL DEFAULT 'pending' CHECK (request_status IN ('pending', 'approved', 'rejected', 'cancelled')),
  message TEXT,
  proposed_start_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_rental_requests_property ON public.rental_requests(property_id);
CREATE INDEX idx_rental_requests_tenant ON public.rental_requests(tenant_id);
CREATE INDEX idx_rental_requests_manager ON public.rental_requests(manager_id);
CREATE INDEX idx_rental_requests_status ON public.rental_requests(request_status);

-- Trigger pour updated_at
CREATE TRIGGER update_rental_requests_updated_at
  BEFORE UPDATE ON public.rental_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.rental_requests ENABLE ROW LEVEL SECURITY;

-- Politiques RLS
CREATE POLICY "Space members can view rental requests"
  ON public.rental_requests
  FOR SELECT
  USING (is_space_member(auth.uid(), space_id));

CREATE POLICY "Tenants can create rental requests"
  ON public.rental_requests
  FOR INSERT
  WITH CHECK (
    has_space_role(auth.uid(), space_id, 'locataire'::app_role) 
    AND auth.uid() = tenant_id
  );

CREATE POLICY "Tenants can cancel their own requests"
  ON public.rental_requests
  FOR UPDATE
  USING (auth.uid() = tenant_id)
  WITH CHECK (request_status = 'cancelled');

CREATE POLICY "Managers can update rental requests"
  ON public.rental_requests
  FOR UPDATE
  USING (has_space_role(auth.uid(), space_id, 'gestionnaire'::app_role));

-- Fonction pour gérer l'approbation atomique d'une demande
CREATE OR REPLACE FUNCTION public.approve_rental_request(
  p_request_id UUID,
  p_start_date DATE,
  p_monthly_rent NUMERIC,
  p_caution_amount NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_property RECORD;
  v_new_lease_id UUID;
  v_payment_id UUID;
  v_result JSON;
BEGIN
  -- 1. Verrouiller et charger la demande
  SELECT * INTO v_request
  FROM public.rental_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Demande de location introuvable';
  END IF;

  -- 2. Vérifications de sécurité et d'état
  IF NOT has_space_role(auth.uid(), v_request.space_id, 'gestionnaire'::app_role) THEN
    RAISE EXCEPTION 'Non autorisé : vous devez être gestionnaire de cet espace';
  END IF;

  IF v_request.request_status != 'pending' THEN
    RAISE EXCEPTION 'Cette demande n''est plus en attente';
  END IF;

  -- 3. Verrouiller et charger la propriété
  SELECT * INTO v_property
  FROM public.properties
  WHERE id = v_request.property_id
  FOR UPDATE;

  IF v_property.statut != 'disponible' THEN
    RAISE EXCEPTION 'La propriété n''est plus disponible';
  END IF;

  -- 4. Créer le bail
  INSERT INTO public.leases (
    property_id,
    locataire_id,
    gestionnaire_id,
    space_id,
    date_debut,
    montant_mensuel,
    caution_montant,
    caution_payee,
    statut
  ) VALUES (
    v_request.property_id,
    v_request.tenant_id,
    v_request.manager_id,
    v_request.space_id,
    p_start_date,
    p_monthly_rent,
    p_caution_amount,
    false,
    'actif'
  )
  RETURNING id INTO v_new_lease_id;

  -- 5. Créer la facture de caution (premier paiement)
  INSERT INTO public.payments (
    lease_id,
    space_id,
    montant,
    mois_paiement,
    methode_paiement,
    numero_telephone,
    statut
  ) VALUES (
    v_new_lease_id,
    v_request.space_id,
    p_caution_amount,
    p_start_date,
    'mobile_money',
    '', -- À remplir par le locataire
    'en_attente'
  )
  RETURNING id INTO v_payment_id;

  -- 6. Mettre à jour le statut de la demande
  UPDATE public.rental_requests
  SET 
    request_status = 'approved',
    updated_at = now()
  WHERE id = p_request_id;

  -- 7. Mettre à jour le statut de la propriété
  UPDATE public.properties
  SET 
    statut = 'loue',
    date_mise_a_jour = now()
  WHERE id = v_request.property_id;

  -- 8. Rejeter automatiquement les autres demandes en attente pour cette propriété
  UPDATE public.rental_requests
  SET 
    request_status = 'rejected',
    updated_at = now()
  WHERE property_id = v_request.property_id
    AND id != p_request_id
    AND request_status = 'pending';

  -- 9. Créer une notification pour le locataire
  INSERT INTO public.notifications (
    user_id,
    lease_id,
    type,
    titre,
    message
  ) VALUES (
    v_request.tenant_id,
    v_new_lease_id,
    'paiement_recu',
    'Demande de location approuvée',
    'Félicitations ! Votre demande pour "' || v_property.titre || '" a été approuvée. Veuillez payer la caution de ' || p_caution_amount || ' FCFA.'
  );

  -- Retourner le résultat
  v_result := json_build_object(
    'success', true,
    'lease_id', v_new_lease_id,
    'payment_id', v_payment_id,
    'message', 'Attribution réussie, bail créé et caution facturée'
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erreur lors de l''approbation : %', SQLERRM;
END;
$$;

-- Fonction pour rejeter une demande
CREATE OR REPLACE FUNCTION public.reject_rental_request(
  p_request_id UUID,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_property RECORD;
  v_result JSON;
BEGIN
  -- 1. Charger la demande
  SELECT * INTO v_request
  FROM public.rental_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Demande de location introuvable';
  END IF;

  -- 2. Vérifications de sécurité
  IF NOT has_space_role(auth.uid(), v_request.space_id, 'gestionnaire'::app_role) THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  IF v_request.request_status != 'pending' THEN
    RAISE EXCEPTION 'Cette demande n''est plus en attente';
  END IF;

  -- 3. Mettre à jour le statut
  UPDATE public.rental_requests
  SET 
    request_status = 'rejected',
    updated_at = now()
  WHERE id = p_request_id;

  -- 4. Charger la propriété
  SELECT * INTO v_property
  FROM public.properties
  WHERE id = v_request.property_id;

  -- 5. Notifier le locataire
  INSERT INTO public.notifications (
    user_id,
    lease_id,
    type,
    titre,
    message
  ) VALUES (
    v_request.tenant_id,
    v_request.property_id,
    'nouveau_message',
    'Demande de location rejetée',
    'Votre demande pour "' || v_property.titre || '" a été rejetée.' || 
    CASE WHEN p_rejection_reason IS NOT NULL 
      THEN ' Raison: ' || p_rejection_reason 
      ELSE '' 
    END
  );

  v_result := json_build_object(
    'success', true,
    'message', 'Demande rejetée avec succès'
  );

  RETURN v_result;
END;
$$;