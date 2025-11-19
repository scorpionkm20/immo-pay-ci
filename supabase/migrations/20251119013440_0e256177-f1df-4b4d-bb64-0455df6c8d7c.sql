-- Add rating and comments columns to saved_bedroom_designs table
ALTER TABLE saved_bedroom_designs
ADD COLUMN rating NUMERIC CHECK (rating >= 0 AND rating <= 5),
ADD COLUMN comments TEXT;