-- Create management_spaces table (Espaces de Gestion)
CREATE TABLE public.management_spaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create space_members table (Association utilisateurs <-> espaces)
CREATE TABLE public.space_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id UUID NOT NULL REFERENCES public.management_spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(space_id, user_id, role)
);

-- Enable RLS
ALTER TABLE public.management_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.space_members ENABLE ROW LEVEL SECURITY;

-- Security definer function to check space membership
CREATE OR REPLACE FUNCTION public.is_space_member(_user_id UUID, _space_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.space_members
    WHERE user_id = _user_id
      AND space_id = _space_id
  )
$$;

-- Security definer function to check space role
CREATE OR REPLACE FUNCTION public.has_space_role(_user_id UUID, _space_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.space_members
    WHERE user_id = _user_id
      AND space_id = _space_id
      AND role = _role
  )
$$;

-- Security definer function to get user's spaces
CREATE OR REPLACE FUNCTION public.get_user_spaces(_user_id UUID)
RETURNS TABLE(space_id UUID)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT space_id
  FROM public.space_members
  WHERE user_id = _user_id
$$;

-- RLS Policies for management_spaces
CREATE POLICY "Users can view their spaces"
ON public.management_spaces
FOR SELECT
USING (public.is_space_member(auth.uid(), id));

CREATE POLICY "Users can create spaces"
ON public.management_spaces
FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Space creators can update their spaces"
ON public.management_spaces
FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Space creators can delete their spaces"
ON public.management_spaces
FOR DELETE
USING (auth.uid() = created_by);

-- RLS Policies for space_members
CREATE POLICY "Users can view members of their spaces"
ON public.space_members
FOR SELECT
USING (public.is_space_member(auth.uid(), space_id));

CREATE POLICY "Space gestionnaires can add members"
ON public.space_members
FOR INSERT
WITH CHECK (public.has_space_role(auth.uid(), space_id, 'gestionnaire'));

CREATE POLICY "Space gestionnaires can remove members"
ON public.space_members
FOR DELETE
USING (public.has_space_role(auth.uid(), space_id, 'gestionnaire'));

-- Add space_id to properties table
ALTER TABLE public.properties
ADD COLUMN space_id UUID REFERENCES public.management_spaces(id) ON DELETE CASCADE;

-- Add space_id to leases table
ALTER TABLE public.leases
ADD COLUMN space_id UUID REFERENCES public.management_spaces(id) ON DELETE CASCADE;

-- Add space_id to payments table
ALTER TABLE public.payments
ADD COLUMN space_id UUID REFERENCES public.management_spaces(id) ON DELETE CASCADE;

-- Add space_id to maintenance_tickets table
ALTER TABLE public.maintenance_tickets
ADD COLUMN space_id UUID REFERENCES public.management_spaces(id) ON DELETE CASCADE;

-- Add space_id to documents table
ALTER TABLE public.documents
ADD COLUMN space_id UUID REFERENCES public.management_spaces(id) ON DELETE CASCADE;

-- Add space_id to conversations table
ALTER TABLE public.conversations
ADD COLUMN space_id UUID REFERENCES public.management_spaces(id) ON DELETE CASCADE;

-- Function to migrate existing data
CREATE OR REPLACE FUNCTION public.migrate_to_spaces()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gestionnaire RECORD;
  v_space_id UUID;
BEGIN
  -- Pour chaque gestionnaire, créer un espace et migrer ses données
  FOR v_gestionnaire IN 
    SELECT DISTINCT gestionnaire_id 
    FROM public.properties 
    WHERE gestionnaire_id IS NOT NULL
  LOOP
    -- Créer un espace pour ce gestionnaire
    INSERT INTO public.management_spaces (nom, created_by)
    VALUES (
      'Espace de ' || COALESCE((SELECT full_name FROM public.profiles WHERE user_id = v_gestionnaire.gestionnaire_id), 'Gestionnaire'),
      v_gestionnaire.gestionnaire_id
    )
    RETURNING id INTO v_space_id;
    
    -- Ajouter le gestionnaire comme membre
    INSERT INTO public.space_members (space_id, user_id, role)
    VALUES (v_space_id, v_gestionnaire.gestionnaire_id, 'gestionnaire')
    ON CONFLICT DO NOTHING;
    
    -- Migrer les propriétés
    UPDATE public.properties
    SET space_id = v_space_id
    WHERE gestionnaire_id = v_gestionnaire.gestionnaire_id
      AND space_id IS NULL;
    
    -- Ajouter les propriétaires comme membres de l'espace
    INSERT INTO public.space_members (space_id, user_id, role)
    SELECT v_space_id, proprietaire_id, 'proprietaire'
    FROM public.properties
    WHERE gestionnaire_id = v_gestionnaire.gestionnaire_id
      AND proprietaire_id IS NOT NULL
    ON CONFLICT DO NOTHING;
    
    -- Migrer les baux
    UPDATE public.leases
    SET space_id = v_space_id
    WHERE gestionnaire_id = v_gestionnaire.gestionnaire_id
      AND space_id IS NULL;
    
    -- Ajouter les locataires comme membres de l'espace
    INSERT INTO public.space_members (space_id, user_id, role)
    SELECT v_space_id, locataire_id, 'locataire'
    FROM public.leases
    WHERE gestionnaire_id = v_gestionnaire.gestionnaire_id
      AND locataire_id IS NOT NULL
    ON CONFLICT DO NOTHING;
    
    -- Migrer les paiements
    UPDATE public.payments p
    SET space_id = v_space_id
    FROM public.leases l
    WHERE p.lease_id = l.id
      AND l.gestionnaire_id = v_gestionnaire.gestionnaire_id
      AND p.space_id IS NULL;
    
    -- Migrer les tickets de maintenance
    UPDATE public.maintenance_tickets mt
    SET space_id = v_space_id
    FROM public.leases l
    WHERE mt.lease_id = l.id
      AND l.gestionnaire_id = v_gestionnaire.gestionnaire_id
      AND mt.space_id IS NULL;
    
    -- Migrer les documents
    UPDATE public.documents d
    SET space_id = v_space_id
    FROM public.leases l
    WHERE d.lease_id = l.id
      AND l.gestionnaire_id = v_gestionnaire.gestionnaire_id
      AND d.space_id IS NULL;
    
    -- Migrer les conversations
    UPDATE public.conversations
    SET space_id = v_space_id
    WHERE gestionnaire_id = v_gestionnaire.gestionnaire_id
      AND space_id IS NULL;
  END LOOP;
END;
$$;

-- Execute migration
SELECT public.migrate_to_spaces();

-- Make space_id required after migration
ALTER TABLE public.properties ALTER COLUMN space_id SET NOT NULL;
ALTER TABLE public.leases ALTER COLUMN space_id SET NOT NULL;
ALTER TABLE public.payments ALTER COLUMN space_id SET NOT NULL;
ALTER TABLE public.maintenance_tickets ALTER COLUMN space_id SET NOT NULL;
ALTER TABLE public.documents ALTER COLUMN space_id SET NOT NULL;
ALTER TABLE public.conversations ALTER COLUMN space_id SET NOT NULL;

-- Drop old RLS policies and create new ones based on space_id

-- Properties policies
DROP POLICY IF EXISTS "Anyone can view available properties" ON public.properties;
DROP POLICY IF EXISTS "Gestionnaires can insert properties" ON public.properties;
DROP POLICY IF EXISTS "Gestionnaires can update their properties" ON public.properties;
DROP POLICY IF EXISTS "Gestionnaires can delete their properties" ON public.properties;
DROP POLICY IF EXISTS "Proprietaires can validate properties" ON public.properties;

CREATE POLICY "Anyone can view available properties or space members can view all"
ON public.properties
FOR SELECT
USING (
  statut = 'disponible'::property_status 
  OR public.is_space_member(auth.uid(), space_id)
);

CREATE POLICY "Space gestionnaires can insert properties"
ON public.properties
FOR INSERT
WITH CHECK (
  public.has_space_role(auth.uid(), space_id, 'gestionnaire')
  AND auth.uid() = gestionnaire_id
);

CREATE POLICY "Space gestionnaires can update properties"
ON public.properties
FOR UPDATE
USING (public.has_space_role(auth.uid(), space_id, 'gestionnaire'));

CREATE POLICY "Space gestionnaires can delete properties"
ON public.properties
FOR DELETE
USING (public.has_space_role(auth.uid(), space_id, 'gestionnaire'));

CREATE POLICY "Space proprietaires can validate properties"
ON public.properties
FOR UPDATE
USING (public.has_space_role(auth.uid(), space_id, 'proprietaire'))
WITH CHECK (public.has_space_role(auth.uid(), space_id, 'proprietaire'));

-- Leases policies
DROP POLICY IF EXISTS "Users can view their related leases" ON public.leases;
DROP POLICY IF EXISTS "Gestionnaires can create leases" ON public.leases;
DROP POLICY IF EXISTS "Gestionnaires can update leases" ON public.leases;

CREATE POLICY "Space members can view leases"
ON public.leases
FOR SELECT
USING (public.is_space_member(auth.uid(), space_id));

CREATE POLICY "Space gestionnaires can create leases"
ON public.leases
FOR INSERT
WITH CHECK (
  public.has_space_role(auth.uid(), space_id, 'gestionnaire')
  AND auth.uid() = gestionnaire_id
);

CREATE POLICY "Space gestionnaires can update leases"
ON public.leases
FOR UPDATE
USING (public.has_space_role(auth.uid(), space_id, 'gestionnaire'));

-- Payments policies
DROP POLICY IF EXISTS "Locataires can view their own payments" ON public.payments;
DROP POLICY IF EXISTS "Gestionnaires can view payments for their properties" ON public.payments;
DROP POLICY IF EXISTS "Locataires can create their own payments" ON public.payments;

CREATE POLICY "Space members can view payments"
ON public.payments
FOR SELECT
USING (public.is_space_member(auth.uid(), space_id));

CREATE POLICY "Space locataires can create payments"
ON public.payments
FOR INSERT
WITH CHECK (public.has_space_role(auth.uid(), space_id, 'locataire'));

-- Maintenance tickets policies
DROP POLICY IF EXISTS "Users can view tickets for their leases" ON public.maintenance_tickets;
DROP POLICY IF EXISTS "Locataires can create tickets for their leases" ON public.maintenance_tickets;
DROP POLICY IF EXISTS "Gestionnaires can update tickets" ON public.maintenance_tickets;

CREATE POLICY "Space members can view tickets"
ON public.maintenance_tickets
FOR SELECT
USING (public.is_space_member(auth.uid(), space_id));

CREATE POLICY "Space locataires can create tickets"
ON public.maintenance_tickets
FOR INSERT
WITH CHECK (
  public.has_space_role(auth.uid(), space_id, 'locataire')
  AND auth.uid() = created_by
);

CREATE POLICY "Space gestionnaires can update tickets"
ON public.maintenance_tickets
FOR UPDATE
USING (public.has_space_role(auth.uid(), space_id, 'gestionnaire'));

-- Documents policies
DROP POLICY IF EXISTS "Users can view documents related to their leases" ON public.documents;
DROP POLICY IF EXISTS "Gestionnaires can upload documents" ON public.documents;
DROP POLICY IF EXISTS "Users can update their documents" ON public.documents;
DROP POLICY IF EXISTS "Gestionnaires can delete documents" ON public.documents;

CREATE POLICY "Space members can view documents"
ON public.documents
FOR SELECT
USING (public.is_space_member(auth.uid(), space_id));

CREATE POLICY "Space gestionnaires can upload documents"
ON public.documents
FOR INSERT
WITH CHECK (public.has_space_role(auth.uid(), space_id, 'gestionnaire'));

CREATE POLICY "Space members can update documents"
ON public.documents
FOR UPDATE
USING (public.is_space_member(auth.uid(), space_id));

CREATE POLICY "Space gestionnaires can delete documents"
ON public.documents
FOR DELETE
USING (public.has_space_role(auth.uid(), space_id, 'gestionnaire'));

-- Conversations policies
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON public.conversations;

CREATE POLICY "Space members can view conversations"
ON public.conversations
FOR SELECT
USING (public.is_space_member(auth.uid(), space_id));

CREATE POLICY "Space members can create conversations"
ON public.conversations
FOR INSERT
WITH CHECK (public.is_space_member(auth.uid(), space_id));

CREATE POLICY "Space members can update conversations"
ON public.conversations
FOR UPDATE
USING (public.is_space_member(auth.uid(), space_id));

-- Messages policies (messages héritent de la sécurité via conversations)
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can create messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;

CREATE POLICY "Space members can view messages"
ON public.messages
FOR SELECT
USING (
  conversation_id IN (
    SELECT id FROM public.conversations 
    WHERE public.is_space_member(auth.uid(), space_id)
  )
);

CREATE POLICY "Space members can create messages"
ON public.messages
FOR INSERT
WITH CHECK (
  conversation_id IN (
    SELECT id FROM public.conversations 
    WHERE public.is_space_member(auth.uid(), space_id)
  )
);

CREATE POLICY "Space members can update messages"
ON public.messages
FOR UPDATE
USING (
  conversation_id IN (
    SELECT id FROM public.conversations 
    WHERE public.is_space_member(auth.uid(), space_id)
  )
);

-- Maintenance interventions policies
DROP POLICY IF EXISTS "Users can view interventions for their tickets" ON public.maintenance_interventions;
DROP POLICY IF EXISTS "Gestionnaires can create interventions" ON public.maintenance_interventions;

CREATE POLICY "Space members can view interventions"
ON public.maintenance_interventions
FOR SELECT
USING (
  ticket_id IN (
    SELECT id FROM public.maintenance_tickets 
    WHERE public.is_space_member(auth.uid(), space_id)
  )
);

CREATE POLICY "Space gestionnaires can create interventions"
ON public.maintenance_interventions
FOR INSERT
WITH CHECK (
  ticket_id IN (
    SELECT mt.id FROM public.maintenance_tickets mt
    WHERE public.has_space_role(auth.uid(), mt.space_id, 'gestionnaire')
  )
  AND auth.uid() = intervenant_id
);

-- Trigger to auto-add user to space when creating it
CREATE OR REPLACE FUNCTION public.auto_add_creator_to_space()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.space_members (space_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'gestionnaire');
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_add_creator_to_space_trigger
AFTER INSERT ON public.management_spaces
FOR EACH ROW
EXECUTE FUNCTION public.auto_add_creator_to_space();

-- Trigger to update updated_at
CREATE TRIGGER update_management_spaces_updated_at
BEFORE UPDATE ON public.management_spaces
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();