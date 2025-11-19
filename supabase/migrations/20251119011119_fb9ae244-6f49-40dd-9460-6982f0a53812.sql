-- Mettre à jour le bucket message-attachments pour le rendre public
UPDATE storage.buckets
SET public = true
WHERE id = 'message-attachments';