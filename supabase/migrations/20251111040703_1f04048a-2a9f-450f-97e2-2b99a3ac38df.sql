-- Add support for file attachments in messages
ALTER TABLE public.messages
ADD COLUMN file_url TEXT,
ADD COLUMN file_type TEXT,
ADD COLUMN file_name TEXT;

-- Create storage bucket for message attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-attachments',
  'message-attachments',
  false,
  20971520, -- 20MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- RLS policies for message-attachments bucket
CREATE POLICY "Users can view attachments in their conversations"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'message-attachments' AND
  (storage.foldername(name))[1] IN (
    SELECT conversation_id::text 
    FROM messages 
    WHERE id::text = (storage.foldername(name))[2]
    AND conversation_id IN (
      SELECT id FROM conversations 
      WHERE auth.uid() = locataire_id OR auth.uid() = gestionnaire_id
    )
  )
);

CREATE POLICY "Users can upload attachments to their conversations"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'message-attachments' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM conversations 
    WHERE auth.uid() = locataire_id OR auth.uid() = gestionnaire_id
  )
);

CREATE POLICY "Users can delete their own attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'message-attachments' AND
  (storage.foldername(name))[1] IN (
    SELECT conversation_id::text 
    FROM messages 
    WHERE sender_id = auth.uid()
    AND id::text = (storage.foldername(name))[2]
  )
);

-- Add index for better performance on messages with files
CREATE INDEX idx_messages_with_files ON public.messages(conversation_id) WHERE file_url IS NOT NULL;