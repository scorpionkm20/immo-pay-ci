-- Create space invitations table
CREATE TABLE IF NOT EXISTS public.space_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id UUID NOT NULL REFERENCES public.management_spaces(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role app_role NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted BOOLEAN NOT NULL DEFAULT false,
  accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_space_invitations_token ON public.space_invitations(token);
CREATE INDEX idx_space_invitations_email ON public.space_invitations(email);
CREATE INDEX idx_space_invitations_space_id ON public.space_invitations(space_id);

-- Enable RLS
ALTER TABLE public.space_invitations ENABLE ROW LEVEL SECURITY;

-- Space gestionnaires can create invitations
CREATE POLICY "Space gestionnaires can create invitations"
ON public.space_invitations
FOR INSERT
WITH CHECK (
  has_space_role(auth.uid(), space_id, 'gestionnaire'::app_role)
  AND auth.uid() = invited_by
);

-- Space gestionnaires can view invitations for their spaces
CREATE POLICY "Space gestionnaires can view invitations"
ON public.space_invitations
FOR SELECT
USING (
  has_space_role(auth.uid(), space_id, 'gestionnaire'::app_role)
);

-- Users can view invitations sent to their email
CREATE POLICY "Users can view their own invitations"
ON public.space_invitations
FOR SELECT
USING (
  auth.jwt()->>'email' = email
);

-- Users can accept invitations sent to their email
CREATE POLICY "Users can accept their invitations"
ON public.space_invitations
FOR UPDATE
USING (
  auth.jwt()->>'email' = email
  AND NOT accepted
  AND expires_at > now()
)
WITH CHECK (
  auth.jwt()->>'email' = email
);

-- Space gestionnaires can delete invitations
CREATE POLICY "Space gestionnaires can delete invitations"
ON public.space_invitations
FOR DELETE
USING (
  has_space_role(auth.uid(), space_id, 'gestionnaire'::app_role)
);

-- Update updated_at trigger
CREATE TRIGGER update_space_invitations_updated_at
BEFORE UPDATE ON public.space_invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();