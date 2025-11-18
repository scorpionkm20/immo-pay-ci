-- Créer la table saved_bedroom_designs pour stocker les designs de chambre
CREATE TABLE IF NOT EXISTS public.saved_bedroom_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  design_name TEXT NOT NULL,
  style_name TEXT NOT NULL,
  style_description TEXT,
  original_image_url TEXT NOT NULL,
  designed_image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer RLS
ALTER TABLE public.saved_bedroom_designs ENABLE ROW LEVEL SECURITY;

-- Politique pour que les utilisateurs puissent voir leurs propres designs
CREATE POLICY "Users can view their own saved designs"
ON public.saved_bedroom_designs
FOR SELECT
USING (auth.uid() = user_id);

-- Politique pour que les utilisateurs puissent créer leurs propres designs
CREATE POLICY "Users can create their own saved designs"
ON public.saved_bedroom_designs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Politique pour que les utilisateurs puissent supprimer leurs propres designs
CREATE POLICY "Users can delete their own saved designs"
ON public.saved_bedroom_designs
FOR DELETE
USING (auth.uid() = user_id);

-- Politique pour que les utilisateurs puissent modifier leurs propres designs
CREATE POLICY "Users can update their own saved designs"
ON public.saved_bedroom_designs
FOR UPDATE
USING (auth.uid() = user_id);

-- Index pour améliorer les performances
CREATE INDEX idx_saved_bedroom_designs_user_id ON public.saved_bedroom_designs(user_id);
CREATE INDEX idx_saved_bedroom_designs_created_at ON public.saved_bedroom_designs(created_at DESC);

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_saved_bedroom_designs_updated_at
BEFORE UPDATE ON public.saved_bedroom_designs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();