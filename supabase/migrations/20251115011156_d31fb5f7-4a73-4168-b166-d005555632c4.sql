-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Only admins, gestionnaires and proprietaires can create spaces" ON public.management_spaces;

-- Create a new, more flexible policy that allows:
-- 1. Users with global roles (admin, gestionnaire, proprietaire) in user_roles
-- 2. Users who are already gestionnaires in any existing space
CREATE POLICY "Gestionnaires and admins can create spaces"
ON public.management_spaces
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.uid() = created_by) 
  AND 
  (
    -- Check if user has a global role
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'gestionnaire'::app_role) 
    OR has_role(auth.uid(), 'proprietaire'::app_role)
    OR
    -- Or if user is already a gestionnaire in any space
    EXISTS (
      SELECT 1 FROM public.space_members
      WHERE user_id = auth.uid() 
      AND role = 'gestionnaire'::app_role
    )
  )
);