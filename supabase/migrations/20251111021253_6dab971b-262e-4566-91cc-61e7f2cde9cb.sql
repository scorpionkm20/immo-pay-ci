-- Create conversations table
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL,
  locataire_id UUID NOT NULL,
  gestionnaire_id UUID NOT NULL,
  dernier_message TEXT,
  dernier_message_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  lu BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Conversations policies
CREATE POLICY "Users can view their own conversations"
ON public.conversations
FOR SELECT
USING (auth.uid() = locataire_id OR auth.uid() = gestionnaire_id);

CREATE POLICY "Users can create conversations"
ON public.conversations
FOR INSERT
WITH CHECK (auth.uid() = locataire_id OR auth.uid() = gestionnaire_id);

CREATE POLICY "Users can update their own conversations"
ON public.conversations
FOR UPDATE
USING (auth.uid() = locataire_id OR auth.uid() = gestionnaire_id);

-- Messages policies
CREATE POLICY "Users can view messages in their conversations"
ON public.messages
FOR SELECT
USING (
  conversation_id IN (
    SELECT id FROM public.conversations
    WHERE auth.uid() = locataire_id OR auth.uid() = gestionnaire_id
  )
);

CREATE POLICY "Users can create messages in their conversations"
ON public.messages
FOR INSERT
WITH CHECK (
  conversation_id IN (
    SELECT id FROM public.conversations
    WHERE auth.uid() = locataire_id OR auth.uid() = gestionnaire_id
  )
);

CREATE POLICY "Users can update their own messages"
ON public.messages
FOR UPDATE
USING (
  conversation_id IN (
    SELECT id FROM public.conversations
    WHERE auth.uid() = locataire_id OR auth.uid() = gestionnaire_id
  )
);

-- Create triggers for updated_at
CREATE TRIGGER update_conversations_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to update conversation on new message
CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET 
    dernier_message = NEW.content,
    dernier_message_date = NEW.created_at,
    updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger for updating conversation
CREATE TRIGGER update_conversation_on_new_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_on_message();

-- Create function to create notification on new message
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
  -- Get conversation details
  SELECT * INTO v_conversation
  FROM public.conversations
  WHERE id = NEW.conversation_id;
  
  -- Determine receiver (the person who didn't send the message)
  IF NEW.sender_id = v_conversation.locataire_id THEN
    v_receiver_id := v_conversation.gestionnaire_id;
  ELSE
    v_receiver_id := v_conversation.locataire_id;
  END IF;
  
  -- Get sender name
  SELECT full_name INTO v_sender_name
  FROM public.profiles
  WHERE user_id = NEW.sender_id;
  
  -- Get property title
  SELECT titre INTO v_property_title
  FROM public.properties
  WHERE id = v_conversation.property_id;
  
  -- Create notification
  INSERT INTO public.notifications (
    user_id,
    lease_id,
    type,
    titre,
    message
  ) VALUES (
    v_receiver_id,
    v_conversation.property_id,
    'paiement_recu',
    'Nouveau message',
    v_sender_name || ' vous a envoyé un message concernant ' || v_property_title
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for notifications
CREATE TRIGGER notify_on_new_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_message();

-- Create indexes
CREATE INDEX idx_conversations_property_id ON public.conversations(property_id);
CREATE INDEX idx_conversations_locataire_id ON public.conversations(locataire_id);
CREATE INDEX idx_conversations_gestionnaire_id ON public.conversations(gestionnaire_id);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;