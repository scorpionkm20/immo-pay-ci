-- Create notification preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nouveau_message BOOLEAN DEFAULT true,
  paiement_recu BOOLEAN DEFAULT true,
  rappel_paiement BOOLEAN DEFAULT true,
  retard_paiement BOOLEAN DEFAULT true,
  nouveau_ticket BOOLEAN DEFAULT true,
  mise_a_jour_ticket BOOLEAN DEFAULT true,
  document_a_signer BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_preferences
CREATE POLICY "Users can view their own preferences"
  ON public.notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to create default preferences for new users
CREATE OR REPLACE FUNCTION public.create_default_notification_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger to create default preferences
CREATE TRIGGER create_user_notification_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_notification_preferences();

-- Function to check if user wants this notification type
CREATE OR REPLACE FUNCTION public.should_notify(user_uuid UUID, notif_type TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefs RECORD;
BEGIN
  SELECT * INTO prefs FROM public.notification_preferences WHERE user_id = user_uuid;
  
  IF NOT FOUND THEN
    RETURN true; -- Default to sending if no preferences set
  END IF;
  
  CASE notif_type
    WHEN 'nouveau_message' THEN RETURN prefs.nouveau_message;
    WHEN 'paiement_recu' THEN RETURN prefs.paiement_recu;
    WHEN 'rappel_paiement' THEN RETURN prefs.rappel_paiement;
    WHEN 'retard_paiement' THEN RETURN prefs.retard_paiement;
    WHEN 'nouveau_ticket' THEN RETURN prefs.nouveau_ticket;
    WHEN 'mise_a_jour_ticket' THEN RETURN prefs.mise_a_jour_ticket;
    WHEN 'document_a_signer' THEN RETURN prefs.document_a_signer;
    ELSE RETURN true;
  END CASE;
END;
$$;

-- Update notify_new_message to check preferences
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation RECORD;
  v_receiver_id UUID;
  v_sender_name TEXT;
  v_property_title TEXT;
BEGIN
  SELECT * INTO v_conversation FROM public.conversations WHERE id = NEW.conversation_id;
  
  IF NEW.sender_id = v_conversation.locataire_id THEN
    v_receiver_id := v_conversation.gestionnaire_id;
  ELSE
    v_receiver_id := v_conversation.locataire_id;
  END IF;
  
  -- Check if user wants message notifications
  IF NOT public.should_notify(v_receiver_id, 'nouveau_message') THEN
    RETURN NEW;
  END IF;
  
  SELECT full_name INTO v_sender_name FROM public.profiles WHERE user_id = NEW.sender_id;
  SELECT titre INTO v_property_title FROM public.properties WHERE id = v_conversation.property_id;
  
  INSERT INTO public.notifications (user_id, lease_id, type, titre, message)
  VALUES (
    v_receiver_id,
    v_conversation.property_id,
    'nouveau_message',
    'Nouveau message',
    v_sender_name || ' vous a envoyé un message concernant ' || v_property_title
  );
  
  RETURN NEW;
END;
$$;

-- Function to notify on new maintenance ticket
CREATE OR REPLACE FUNCTION public.notify_new_ticket()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lease RECORD;
  v_gestionnaire_id UUID;
BEGIN
  SELECT * INTO v_lease FROM public.leases WHERE id = NEW.lease_id;
  
  IF v_lease IS NULL THEN
    RETURN NEW;
  END IF;
  
  v_gestionnaire_id := v_lease.gestionnaire_id;
  
  -- Notify property manager
  IF public.should_notify(v_gestionnaire_id, 'nouveau_ticket') THEN
    INSERT INTO public.notifications (user_id, lease_id, type, titre, message)
    VALUES (
      v_gestionnaire_id,
      NEW.lease_id,
      'nouveau_ticket',
      'Nouveau ticket de maintenance',
      'Un nouveau ticket "' || NEW.titre || '" a été créé avec priorité ' || NEW.priorite
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for new maintenance tickets
DROP TRIGGER IF EXISTS notify_on_new_ticket ON public.maintenance_tickets;
CREATE TRIGGER notify_on_new_ticket
  AFTER INSERT ON public.maintenance_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_ticket();

-- Function to notify on ticket status update
CREATE OR REPLACE FUNCTION public.notify_ticket_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lease RECORD;
  v_locataire_id UUID;
BEGIN
  IF OLD.statut = NEW.statut THEN
    RETURN NEW;
  END IF;
  
  SELECT * INTO v_lease FROM public.leases WHERE id = NEW.lease_id;
  
  IF v_lease IS NULL THEN
    RETURN NEW;
  END IF;
  
  v_locataire_id := v_lease.locataire_id;
  
  -- Notify tenant
  IF public.should_notify(v_locataire_id, 'mise_a_jour_ticket') THEN
    INSERT INTO public.notifications (user_id, lease_id, type, titre, message)
    VALUES (
      v_locataire_id,
      NEW.lease_id,
      'mise_a_jour_ticket',
      'Mise à jour ticket maintenance',
      'Le ticket "' || NEW.titre || '" est passé à l''état: ' || NEW.statut
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for ticket updates
DROP TRIGGER IF EXISTS notify_on_ticket_update ON public.maintenance_tickets;
CREATE TRIGGER notify_on_ticket_update
  AFTER UPDATE ON public.maintenance_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_ticket_update();

-- Function to notify on new document
CREATE OR REPLACE FUNCTION public.notify_new_document()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lease RECORD;
BEGIN
  SELECT * INTO v_lease FROM public.leases WHERE id = NEW.lease_id;
  
  IF v_lease IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Notify tenant if document requires signature
  IF NEW.type_document = 'bail' OR NEW.type_document = 'avenant' THEN
    IF public.should_notify(v_lease.locataire_id, 'document_a_signer') THEN
      INSERT INTO public.notifications (user_id, lease_id, type, titre, message)
      VALUES (
        v_lease.locataire_id,
        NEW.lease_id,
        'document_a_signer',
        'Document à signer',
        'Un nouveau document "' || NEW.titre || '" nécessite votre signature'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for new documents
DROP TRIGGER IF EXISTS notify_on_new_document ON public.documents;
CREATE TRIGGER notify_on_new_document
  AFTER INSERT ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_document();

-- Add trigger for updated_at on notification_preferences
DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON public.notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();