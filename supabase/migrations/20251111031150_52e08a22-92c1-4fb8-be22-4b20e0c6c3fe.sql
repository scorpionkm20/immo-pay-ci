-- Add latitude and longitude columns to properties table
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS latitude numeric,
ADD COLUMN IF NOT EXISTS longitude numeric;

-- Add comment for documentation
COMMENT ON COLUMN public.properties.latitude IS 'Latitude GPS de la propriété';
COMMENT ON COLUMN public.properties.longitude IS 'Longitude GPS de la propriété';