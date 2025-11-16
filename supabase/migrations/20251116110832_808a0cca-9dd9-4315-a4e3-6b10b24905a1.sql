-- Supprimer les anciennes policies sur documents
DROP POLICY IF EXISTS "Space gestionnaires can delete documents" ON public.documents;
DROP POLICY IF EXISTS "Space gestionnaires can upload documents" ON public.documents;
DROP POLICY IF EXISTS "Space members can update documents" ON public.documents;
DROP POLICY IF EXISTS "Space members can view documents" ON public.documents;

-- Réappliquer la RLS (au cas où)
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- 1. Règle SELECT (Lecture)
-- "Les membres d'un espace peuvent VOIR les documents de cet espace."
CREATE POLICY "Les membres peuvent lire les documents de leur espace"
ON public.documents
FOR SELECT USING (
  public.is_space_member(auth.uid(), space_id)
);

-- 2. Règle INSERT (Création / Upload)
-- "Un membre ne peut UPLOADER un document que DANS son propre espace."
CREATE POLICY "Les membres peuvent créer des documents dans leur espace"
ON public.documents
FOR INSERT WITH CHECK (
  public.is_space_member(auth.uid(), space_id) AND
  (uploaded_by = auth.uid())
);

-- 3. Règle UPDATE (Modification)
-- "Seuls les GESTIONNAIRES peuvent modifier les métadonnées d'un document."
CREATE POLICY "Les gestionnaires peuvent modifier les documents"
ON public.documents
FOR UPDATE USING (
  public.has_space_role(auth.uid(), space_id, 'gestionnaire'::app_role)
);

-- 4. Règle DELETE (Suppression)
-- "Seuls les GESTIONNAIRES peuvent supprimer un document."
CREATE POLICY "Les gestionnaires peuvent supprimer les documents"
ON public.documents
FOR DELETE USING (
  public.has_space_role(auth.uid(), space_id, 'gestionnaire'::app_role)
);