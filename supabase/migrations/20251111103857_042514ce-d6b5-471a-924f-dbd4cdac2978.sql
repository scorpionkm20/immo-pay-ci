-- Create search alerts table
CREATE TABLE IF NOT EXISTS public.search_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nom_alerte TEXT NOT NULL,
  actif BOOLEAN DEFAULT true,
  frequence TEXT NOT NULL DEFAULT 'instantane',
  
  -- Search criteria
  ville TEXT,
  quartier TEXT,
  type_propriete TEXT,
  prix_min NUMERIC,
  prix_max NUMERIC,
  surface_min NUMERIC,
  surface_max NUMERIC,
  nombre_pieces_min INTEGER,
  nombre_pieces_max INTEGER,
  equipements TEXT[],
  
  -- Tracking
  derniere_verification TIMESTAMP WITH TIME ZONE DEFAULT now(),
  derniere_notification TIMESTAMP WITH TIME ZONE,
  nombre_notifications INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT frequence_check CHECK (frequence IN ('instantane', 'quotidien', 'hebdomadaire'))
);

-- Enable RLS
ALTER TABLE public.search_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own alerts"
  ON public.search_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own alerts"
  ON public.search_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts"
  ON public.search_alerts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own alerts"
  ON public.search_alerts FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_search_alerts_updated_at
  BEFORE UPDATE ON public.search_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check if property matches alert criteria
CREATE OR REPLACE FUNCTION public.property_matches_alert(
  property_record public.properties,
  alert_record public.search_alerts
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check ville
  IF alert_record.ville IS NOT NULL AND property_record.ville != alert_record.ville THEN
    RETURN false;
  END IF;
  
  -- Check quartier
  IF alert_record.quartier IS NOT NULL AND property_record.quartier != alert_record.quartier THEN
    RETURN false;
  END IF;
  
  -- Check type_propriete
  IF alert_record.type_propriete IS NOT NULL AND property_record.type_propriete != alert_record.type_propriete THEN
    RETURN false;
  END IF;
  
  -- Check prix_min
  IF alert_record.prix_min IS NOT NULL AND property_record.prix_mensuel < alert_record.prix_min THEN
    RETURN false;
  END IF;
  
  -- Check prix_max
  IF alert_record.prix_max IS NOT NULL AND property_record.prix_mensuel > alert_record.prix_max THEN
    RETURN false;
  END IF;
  
  -- Check surface_min
  IF alert_record.surface_min IS NOT NULL AND (property_record.surface_m2 IS NULL OR property_record.surface_m2 < alert_record.surface_min) THEN
    RETURN false;
  END IF;
  
  -- Check surface_max
  IF alert_record.surface_max IS NOT NULL AND property_record.surface_m2 IS NOT NULL AND property_record.surface_m2 > alert_record.surface_max THEN
    RETURN false;
  END IF;
  
  -- Check nombre_pieces_min
  IF alert_record.nombre_pieces_min IS NOT NULL AND property_record.nombre_pieces < alert_record.nombre_pieces_min THEN
    RETURN false;
  END IF;
  
  -- Check nombre_pieces_max
  IF alert_record.nombre_pieces_max IS NOT NULL AND property_record.nombre_pieces > alert_record.nombre_pieces_max THEN
    RETURN false;
  END IF;
  
  -- Check equipements (all required equipements must be present)
  IF alert_record.equipements IS NOT NULL AND array_length(alert_record.equipements, 1) > 0 THEN
    IF NOT alert_record.equipements <@ property_record.equipements THEN
      RETURN false;
    END IF;
  END IF;
  
  RETURN true;
END;
$$;

-- Function to notify user about matching property
CREATE OR REPLACE FUNCTION public.notify_matching_properties()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alert_record public.search_alerts;
BEGIN
  -- Only process new properties that are disponible
  IF TG_OP = 'INSERT' AND NEW.statut = 'disponible' THEN
    -- Check all active instant alerts
    FOR alert_record IN 
      SELECT * FROM public.search_alerts 
      WHERE actif = true AND frequence = 'instantane'
    LOOP
      -- Check if property matches alert
      IF public.property_matches_alert(NEW, alert_record) THEN
        -- Create notification
        IF public.should_notify(alert_record.user_id, 'nouveau_message') THEN
          INSERT INTO public.notifications (user_id, lease_id, type, titre, message)
          VALUES (
            alert_record.user_id,
            NEW.id,
            'nouveau_message',
            'Nouvelle propriété correspondant à votre alerte',
            'Une nouvelle propriété "' || NEW.titre || '" à ' || NEW.ville || ' correspond à votre alerte "' || alert_record.nom_alerte || '"'
          );
        END IF;
        
        -- Update alert stats
        UPDATE public.search_alerts
        SET 
          derniere_notification = now(),
          nombre_notifications = nombre_notifications + 1
        WHERE id = alert_record.id;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to check new properties against alerts
DROP TRIGGER IF EXISTS check_property_alerts ON public.properties;
CREATE TRIGGER check_property_alerts
  AFTER INSERT ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_matching_properties();