-- Supprimer l'ancienne politique restrictive
DROP POLICY IF EXISTS "Space locataires can create payments" ON public.payments;

-- Créer une nouvelle politique permettant aux gestionnaires et locataires de créer des paiements
CREATE POLICY "Space members can create payments"
ON public.payments
FOR INSERT
WITH CHECK (
  is_space_member(auth.uid(), space_id) AND
  (
    has_space_role(auth.uid(), space_id, 'gestionnaire'::app_role) OR
    has_space_role(auth.uid(), space_id, 'locataire'::app_role)
  )
);