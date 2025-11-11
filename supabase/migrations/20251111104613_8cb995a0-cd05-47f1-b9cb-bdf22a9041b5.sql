-- Create favorites table
CREATE TABLE IF NOT EXISTS public.property_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  prix_initial NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, property_id)
);

-- Enable RLS
ALTER TABLE public.property_favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own favorites"
  ON public.property_favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add favorites"
  ON public.property_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own favorites"
  ON public.property_favorites FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
  ON public.property_favorites FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_property_favorites_updated_at
  BEFORE UPDATE ON public.property_favorites
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to notify on price drop
CREATE OR REPLACE FUNCTION public.notify_favorite_price_drop()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  favorite_record RECORD;
  price_difference NUMERIC;
  percentage_drop NUMERIC;
BEGIN
  -- Only check if price has decreased
  IF TG_OP = 'UPDATE' AND NEW.prix_mensuel < OLD.prix_mensuel THEN
    -- Find all users who have favorited this property
    FOR favorite_record IN 
      SELECT * FROM public.property_favorites 
      WHERE property_id = NEW.id
    LOOP
      -- Calculate price difference
      price_difference := favorite_record.prix_initial - NEW.prix_mensuel;
      
      -- Only notify if price dropped by at least 5% and at least 10,000 FCFA
      IF price_difference >= 10000 THEN
        percentage_drop := (price_difference / favorite_record.prix_initial) * 100;
        
        IF percentage_drop >= 5 THEN
          -- Check if user wants notifications
          IF public.should_notify(favorite_record.user_id, 'paiement_recu') THEN
            INSERT INTO public.notifications (user_id, lease_id, type, titre, message)
            VALUES (
              favorite_record.user_id,
              NEW.id,
              'paiement_recu',
              'Baisse de prix sur un favori',
              'Le prix de "' || NEW.titre || '" est passé de ' || 
              favorite_record.prix_initial::TEXT || ' à ' || NEW.prix_mensuel::TEXT || 
              ' FCFA (' || ROUND(percentage_drop, 1)::TEXT || '% de réduction)'
            );
          END IF;
        END IF;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for price drop notifications
DROP TRIGGER IF EXISTS notify_on_favorite_price_drop ON public.properties;
CREATE TRIGGER notify_on_favorite_price_drop
  AFTER UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_favorite_price_drop();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_property_favorites_user_id ON public.property_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_property_favorites_property_id ON public.property_favorites(property_id);