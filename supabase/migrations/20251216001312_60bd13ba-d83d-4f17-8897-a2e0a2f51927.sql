-- Update the approve_rental_request function to use a better notification type
CREATE OR REPLACE FUNCTION public.approve_rental_request(p_request_id uuid, p_start_date date, p_monthly_rent numeric, p_caution_amount numeric)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- 5. Créer la facture de caution
  INSERT INTO public.payments (
    lease_id,
    space_id,
    montant,
    mois_paiement,
    statut
  ) VALUES (
    v_new_lease_id,
    v_request.space_id,
    p_caution_amount,
    p_start_date,
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

  -- 8. Rejeter automatiquement les autres demandes en attente
  UPDATE public.rental_requests
  SET 
    request_status = 'rejected',
    updated_at = now()
  WHERE property_id = v_request.property_id
    AND id != p_request_id
    AND request_status = 'pending';

  -- 9. NOTIFICATION PUSH pour le locataire - demande approuvée
  INSERT INTO public.notifications (
    user_id,
    lease_id,
    type,
    titre,
    message
  ) VALUES (
    v_request.tenant_id,
    v_new_lease_id,
    'demande_approuvee',
    '🎉 Demande de location approuvée !',
    'Félicitations ! Votre demande pour "' || v_property.titre || '" a été approuvée. Vous pouvez maintenant payer la caution de ' || p_caution_amount || ' FCFA pour finaliser votre bail. Rendez-vous dans "Mes Baux" pour effectuer le paiement.'
  );

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
$function$;