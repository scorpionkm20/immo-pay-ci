-- Créer la table pour les modèles de réponse de rejet
CREATE TABLE IF NOT EXISTS public.rejection_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.management_spaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  nom TEXT NOT NULL,
  message TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Ajouter des RLS policies
ALTER TABLE public.rejection_templates ENABLE ROW LEVEL SECURITY;

-- Les gestionnaires peuvent voir les modèles de leur espace
CREATE POLICY "Space gestionnaires can view templates"
ON public.rejection_templates
FOR SELECT
USING (has_space_role(auth.uid(), space_id, 'gestionnaire'::app_role));

-- Les gestionnaires peuvent créer des modèles dans leur espace
CREATE POLICY "Space gestionnaires can create templates"
ON public.rejection_templates
FOR INSERT
WITH CHECK (
  has_space_role(auth.uid(), space_id, 'gestionnaire'::app_role) AND
  auth.uid() = created_by
);

-- Les gestionnaires peuvent modifier les modèles de leur espace
CREATE POLICY "Space gestionnaires can update templates"
ON public.rejection_templates
FOR UPDATE
USING (has_space_role(auth.uid(), space_id, 'gestionnaire'::app_role));

-- Les gestionnaires peuvent supprimer les modèles de leur espace
CREATE POLICY "Space gestionnaires can delete templates"
ON public.rejection_templates
FOR DELETE
USING (has_space_role(auth.uid(), space_id, 'gestionnaire'::app_role));

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_rejection_templates_updated_at
BEFORE UPDATE ON public.rejection_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insérer quelques modèles par défaut (ils seront créés lors de la création d'un espace)
-- Ces modèles seront créés via l'application pour chaque espace