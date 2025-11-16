-- Étape 1: Corriger les policies UPDATE et DELETE

-- 1. Supprimer les policies non sécurisées basées sur created_by
DROP POLICY IF EXISTS "Space creators can update their spaces" ON public.management_spaces;
DROP POLICY IF EXISTS "Space creators can delete their spaces" ON public.management_spaces;

-- 2. Créer la policy UPDATE sécurisée basée sur le rôle dans l'espace
CREATE POLICY "Seuls les gestionnaires peuvent modifier un espace"
ON public.management_spaces
FOR UPDATE 
USING (
  public.has_space_role(auth.uid(), id, 'gestionnaire'::app_role)
);

-- 3. Créer la policy DELETE sécurisée basée sur le rôle dans l'espace
CREATE POLICY "Seuls les gestionnaires peuvent supprimer un espace"
ON public.management_spaces
FOR DELETE 
USING (
  public.has_space_role(auth.uid(), id, 'gestionnaire'::app_role)
);

-- Étape 2: Résoudre la faille de création

-- 1. Supprimer la policy INSERT défaillante
DROP POLICY IF EXISTS "Gestionnaires and admins can create spaces" ON public.management_spaces;

-- 2. BLOQUER tous les INSERT directs
CREATE POLICY "INSERT direct bloque, utiliser la fonction RPC"
ON public.management_spaces
FOR INSERT 
WITH CHECK (false);

-- 3. Créer la fonction atomique sécurisée
CREATE OR REPLACE FUNCTION public.create_new_space(
  space_name TEXT,
  space_description TEXT DEFAULT NULL
) 
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_space_id uuid;
  current_user_id uuid := auth.uid();
BEGIN
  -- Vérifier que l'utilisateur est authentifié
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non authentifié';
  END IF;
  
  -- Étape 1: Créer l'espace (fonctionne car SECURITY DEFINER)
  INSERT INTO public.management_spaces (nom, description, created_by)
  VALUES (space_name, space_description, current_user_id)
  RETURNING id INTO new_space_id;

  -- Étape 2: Ajouter automatiquement le créateur comme gestionnaire
  -- C'est l'opération atomique qui garantit la sécurité
  INSERT INTO public.space_members (space_id, user_id, role)
  VALUES (new_space_id, current_user_id, 'gestionnaire');

  RETURN new_space_id;
END;
$$;