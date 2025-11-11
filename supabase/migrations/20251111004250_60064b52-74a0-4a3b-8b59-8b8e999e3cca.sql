-- Create enum for property status
CREATE TYPE public.property_status AS ENUM ('disponible', 'loue', 'en_attente_validation', 'indisponible');

-- Create properties table
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gestionnaire_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  proprietaire_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  titre TEXT NOT NULL,
  description TEXT NOT NULL,
  adresse TEXT NOT NULL,
  ville TEXT NOT NULL,
  quartier TEXT,
  prix_mensuel DECIMAL(10,2) NOT NULL,
  caution DECIMAL(10,2) NOT NULL,
  nombre_pieces INTEGER NOT NULL,
  surface_m2 DECIMAL(8,2),
  type_propriete TEXT NOT NULL,
  statut property_status NOT NULL DEFAULT 'disponible',
  images TEXT[] DEFAULT '{}',
  equipements TEXT[] DEFAULT '{}',
  date_publication TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  date_mise_a_jour TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  validation_proprietaire BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create leases table (baux)
CREATE TABLE public.leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  locataire_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gestionnaire_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date_debut DATE NOT NULL,
  date_fin DATE,
  montant_mensuel DECIMAL(10,2) NOT NULL,
  caution_payee BOOLEAN DEFAULT false,
  caution_montant DECIMAL(10,2) NOT NULL,
  statut TEXT NOT NULL DEFAULT 'actif',
  contrat_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create storage bucket for property images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-images',
  'property-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
);

-- Enable RLS
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;

-- RLS Policies for properties
-- Everyone can view available properties
CREATE POLICY "Anyone can view available properties"
  ON public.properties
  FOR SELECT
  USING (statut = 'disponible' OR auth.uid() = gestionnaire_id OR auth.uid() = proprietaire_id);

-- Gestionnaires can insert properties
CREATE POLICY "Gestionnaires can insert properties"
  ON public.properties
  FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'gestionnaire') 
    AND auth.uid() = gestionnaire_id
  );

-- Gestionnaires can update their properties
CREATE POLICY "Gestionnaires can update their properties"
  ON public.properties
  FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'gestionnaire') 
    AND auth.uid() = gestionnaire_id
  );

-- Proprietaires can update validation status
CREATE POLICY "Proprietaires can validate properties"
  ON public.properties
  FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'proprietaire') 
    AND auth.uid() = proprietaire_id
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'proprietaire') 
    AND auth.uid() = proprietaire_id
  );

-- Gestionnaires can delete their properties
CREATE POLICY "Gestionnaires can delete their properties"
  ON public.properties
  FOR DELETE
  USING (
    public.has_role(auth.uid(), 'gestionnaire') 
    AND auth.uid() = gestionnaire_id
  );

-- RLS Policies for leases
-- Users can view their own leases
CREATE POLICY "Users can view their related leases"
  ON public.leases
  FOR SELECT
  USING (
    auth.uid() = locataire_id 
    OR auth.uid() = gestionnaire_id 
    OR auth.uid() IN (
      SELECT proprietaire_id FROM public.properties WHERE id = property_id
    )
  );

-- Gestionnaires can create leases
CREATE POLICY "Gestionnaires can create leases"
  ON public.leases
  FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'gestionnaire') 
    AND auth.uid() = gestionnaire_id
  );

-- Gestionnaires can update leases
CREATE POLICY "Gestionnaires can update leases"
  ON public.leases
  FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'gestionnaire') 
    AND auth.uid() = gestionnaire_id
  );

-- Storage policies for property images
CREATE POLICY "Anyone can view property images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'property-images');

CREATE POLICY "Gestionnaires can upload property images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'property-images' 
    AND public.has_role(auth.uid(), 'gestionnaire')
  );

CREATE POLICY "Gestionnaires can update their property images"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'property-images' 
    AND public.has_role(auth.uid(), 'gestionnaire')
  );

CREATE POLICY "Gestionnaires can delete their property images"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'property-images' 
    AND public.has_role(auth.uid(), 'gestionnaire')
  );

-- Function to update property status when lease is created
CREATE OR REPLACE FUNCTION public.update_property_status_on_lease()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a new lease is created, update property status to 'loue'
  IF TG_OP = 'INSERT' THEN
    UPDATE public.properties
    SET statut = 'loue', date_mise_a_jour = now()
    WHERE id = NEW.property_id;
  END IF;
  
  -- When a lease is deleted, update property status back to 'disponible'
  IF TG_OP = 'DELETE' THEN
    UPDATE public.properties
    SET statut = 'disponible', date_mise_a_jour = now()
    WHERE id = OLD.property_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to update property status
CREATE TRIGGER on_lease_change
  AFTER INSERT OR DELETE ON public.leases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_property_status_on_lease();

-- Trigger for properties updated_at
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for leases updated_at
CREATE TRIGGER update_leases_updated_at
  BEFORE UPDATE ON public.leases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();