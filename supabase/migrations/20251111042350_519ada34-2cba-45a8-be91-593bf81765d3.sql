-- Create virtual tours table
CREATE TABLE public.virtual_tours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  titre TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('video', 'photo_360')),
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tour appointments table
CREATE TABLE public.tour_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  locataire_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gestionnaire_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date_rendez_vous TIMESTAMP WITH TIME ZONE NOT NULL,
  duree_minutes INTEGER DEFAULT 30,
  statut TEXT NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'confirme', 'annule', 'termine')),
  type_visite TEXT NOT NULL DEFAULT 'virtuelle' CHECK (type_visite IN ('virtuelle', 'presentiel')),
  notes_locataire TEXT,
  notes_gestionnaire TEXT,
  lien_video TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.virtual_tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_appointments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for virtual_tours
CREATE POLICY "Anyone can view virtual tours for available properties"
ON public.virtual_tours FOR SELECT
USING (
  property_id IN (
    SELECT id FROM public.properties 
    WHERE statut = 'disponible' OR gestionnaire_id = auth.uid()
  )
);

CREATE POLICY "Gestionnaires can create virtual tours"
ON public.virtual_tours FOR INSERT
WITH CHECK (
  property_id IN (
    SELECT id FROM public.properties WHERE gestionnaire_id = auth.uid()
  ) AND created_by = auth.uid()
);

CREATE POLICY "Gestionnaires can update their virtual tours"
ON public.virtual_tours FOR UPDATE
USING (
  property_id IN (
    SELECT id FROM public.properties WHERE gestionnaire_id = auth.uid()
  )
);

CREATE POLICY "Gestionnaires can delete their virtual tours"
ON public.virtual_tours FOR DELETE
USING (
  property_id IN (
    SELECT id FROM public.properties WHERE gestionnaire_id = auth.uid()
  )
);

-- RLS Policies for tour_appointments
CREATE POLICY "Users can view their own appointments"
ON public.tour_appointments FOR SELECT
USING (
  auth.uid() = locataire_id OR 
  auth.uid() = gestionnaire_id OR
  auth.uid() IN (
    SELECT proprietaire_id FROM public.properties WHERE id = property_id
  )
);

CREATE POLICY "Locataires can create appointments"
ON public.tour_appointments FOR INSERT
WITH CHECK (auth.uid() = locataire_id);

CREATE POLICY "Users can update their own appointments"
ON public.tour_appointments FOR UPDATE
USING (
  auth.uid() = locataire_id OR auth.uid() = gestionnaire_id
);

CREATE POLICY "Users can cancel their own appointments"
ON public.tour_appointments FOR DELETE
USING (
  auth.uid() = locataire_id OR auth.uid() = gestionnaire_id
);

-- Create storage bucket for virtual tours
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'virtual-tours',
  'virtual-tours',
  true,
  524288000, -- 500MB
  ARRAY['video/mp4', 'video/webm', 'image/jpeg', 'image/png', 'image/webp']
);

-- RLS policies for virtual-tours bucket
CREATE POLICY "Anyone can view virtual tour media"
ON storage.objects FOR SELECT
USING (bucket_id = 'virtual-tours');

CREATE POLICY "Gestionnaires can upload virtual tour media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'virtual-tours' AND
  auth.uid() IN (
    SELECT gestionnaire_id FROM public.properties 
    WHERE id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Gestionnaires can delete their virtual tour media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'virtual-tours' AND
  auth.uid() IN (
    SELECT gestionnaire_id FROM public.properties 
    WHERE id::text = (storage.foldername(name))[1]
  )
);

-- Indexes for performance
CREATE INDEX idx_virtual_tours_property ON public.virtual_tours(property_id);
CREATE INDEX idx_virtual_tours_order ON public.virtual_tours(property_id, order_index);
CREATE INDEX idx_tour_appointments_property ON public.tour_appointments(property_id);
CREATE INDEX idx_tour_appointments_gestionnaire ON public.tour_appointments(gestionnaire_id, date_rendez_vous);
CREATE INDEX idx_tour_appointments_locataire ON public.tour_appointments(locataire_id, date_rendez_vous);

-- Function to update updated_at
CREATE TRIGGER update_virtual_tours_updated_at
BEFORE UPDATE ON public.virtual_tours
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tour_appointments_updated_at
BEFORE UPDATE ON public.tour_appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tour_appointments;