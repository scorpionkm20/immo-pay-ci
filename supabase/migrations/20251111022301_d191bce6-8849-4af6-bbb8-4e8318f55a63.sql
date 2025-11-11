-- Create documents storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false);

-- Create documents table
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lease_id UUID NOT NULL,
  titre TEXT NOT NULL,
  type_document TEXT NOT NULL CHECK (type_document IN ('bail', 'quittance', 'etat_lieux', 'autre')),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by UUID NOT NULL,
  signe BOOLEAN NOT NULL DEFAULT false,
  signature_url TEXT,
  date_signature TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Create policies for documents table
CREATE POLICY "Users can view documents related to their leases"
ON public.documents
FOR SELECT
USING (
  lease_id IN (
    SELECT id FROM public.leases
    WHERE auth.uid() = locataire_id OR auth.uid() = gestionnaire_id
  )
);

CREATE POLICY "Gestionnaires can upload documents"
ON public.documents
FOR INSERT
WITH CHECK (
  lease_id IN (
    SELECT id FROM public.leases
    WHERE auth.uid() = gestionnaire_id
  )
);

CREATE POLICY "Users can update their documents"
ON public.documents
FOR UPDATE
USING (
  lease_id IN (
    SELECT id FROM public.leases
    WHERE auth.uid() = locataire_id OR auth.uid() = gestionnaire_id
  )
);

CREATE POLICY "Gestionnaires can delete documents"
ON public.documents
FOR DELETE
USING (
  lease_id IN (
    SELECT id FROM public.leases
    WHERE auth.uid() = gestionnaire_id
  )
);

-- Storage policies for documents bucket
CREATE POLICY "Authenticated users can view their documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "Authenticated users can upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Authenticated users can update documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "Authenticated users can delete documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'documents');

-- Create trigger for updated_at
CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_documents_lease_id ON public.documents(lease_id);
CREATE INDEX idx_documents_type ON public.documents(type_document);
CREATE INDEX idx_documents_signe ON public.documents(signe);