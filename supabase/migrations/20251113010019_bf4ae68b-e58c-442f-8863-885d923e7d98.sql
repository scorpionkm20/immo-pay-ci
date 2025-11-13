-- Update RLS policy for space creation to only allow gestionnaires and proprietaires
DROP POLICY IF EXISTS "Users can create spaces" ON public.management_spaces;

CREATE POLICY "Only gestionnaires and proprietaires can create spaces"
ON public.management_spaces
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by AND (
    public.has_role(auth.uid(), 'gestionnaire'::app_role) OR
    public.has_role(auth.uid(), 'proprietaire'::app_role)
  )
);

-- Add invitation code column to management_spaces
ALTER TABLE public.management_spaces
ADD COLUMN IF NOT EXISTS invitation_code TEXT UNIQUE;

-- Create function to generate invitation code
CREATE OR REPLACE FUNCTION public.generate_invitation_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a 8-character alphanumeric code
    code := upper(substring(md5(random()::text) from 1 for 8));
    
    -- Check if code already exists
    SELECT EXISTS (
      SELECT 1 FROM public.management_spaces WHERE invitation_code = code
    ) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN code;
END;
$$;

-- Create trigger to auto-generate invitation code on space creation
CREATE OR REPLACE FUNCTION public.set_invitation_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.invitation_code IS NULL THEN
    NEW.invitation_code := public.generate_invitation_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_invitation_code_trigger ON public.management_spaces;

CREATE TRIGGER set_invitation_code_trigger
BEFORE INSERT ON public.management_spaces
FOR EACH ROW
EXECUTE FUNCTION public.set_invitation_code();

-- Create function to join space with invitation code
CREATE OR REPLACE FUNCTION public.join_space_with_code(code TEXT, user_role app_role)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  space_id_var uuid;
BEGIN
  -- Find the space with this invitation code
  SELECT id INTO space_id_var
  FROM public.management_spaces
  WHERE invitation_code = code;
  
  IF space_id_var IS NULL THEN
    RAISE EXCEPTION 'Code d''invitation invalide';
  END IF;
  
  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM public.space_members
    WHERE space_id = space_id_var AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Vous êtes déjà membre de cet espace';
  END IF;
  
  -- Add user as member
  INSERT INTO public.space_members (space_id, user_id, role)
  VALUES (space_id_var, auth.uid(), user_role);
  
  RETURN space_id_var;
END;
$$;