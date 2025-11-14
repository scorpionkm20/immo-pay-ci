-- Drop existing policy
DROP POLICY IF EXISTS "Only gestionnaires and proprietaires can create spaces" ON public.management_spaces;

-- Create updated policy that includes admin role
CREATE POLICY "Only admins, gestionnaires and proprietaires can create spaces"
ON public.management_spaces
FOR INSERT
WITH CHECK (
  (auth.uid() = created_by) AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'gestionnaire'::app_role) OR 
    has_role(auth.uid(), 'proprietaire'::app_role)
  )
);