import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Document {
  id: string;
  lease_id: string;
  titre: string;
  type_document: string;
  file_url: string;
  file_name: string;
  file_size: number;
  uploaded_by: string;
  signe: boolean;
  signature_url: string | null;
  date_signature: string | null;
  created_at: string;
  updated_at: string;
}

export const useDocuments = (leaseId?: string) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (leaseId) {
        query = query.eq('lease_id', leaseId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      console.error('Error fetching documents:', error);
    }
    setLoading(false);
  }, [leaseId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const uploadDocument = async (
    leaseId: string,
    file: File,
    titre: string,
    typeDocument: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${leaseId}/${fileName}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Create document record
      const { error: dbError } = await supabase
        .from('documents')
        .insert([{
          lease_id: leaseId,
          titre,
          type_document: typeDocument,
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
          uploaded_by: user.id
        }]);

      if (dbError) throw dbError;

      toast({
        title: "Document ajouté",
        description: "Le document a été téléchargé avec succès"
      });

      fetchDocuments();
      return { error: null };
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message
      });
      return { error };
    }
  };

  const signDocument = async (documentId: string, signatureDataUrl: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      // Convert data URL to blob
      const response = await fetch(signatureDataUrl);
      const blob = await response.blob();
      
      const fileName = `signature-${documentId}-${Date.now()}.png`;
      const filePath = `signatures/${fileName}`;

      // Upload signature to storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, blob);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Update document with signature
      const { error: updateError } = await supabase
        .from('documents')
        .update({
          signe: true,
          signature_url: publicUrl,
          date_signature: new Date().toISOString()
        })
        .eq('id', documentId);

      if (updateError) throw updateError;

      toast({
        title: "Document signé",
        description: "Votre signature a été enregistrée"
      });

      fetchDocuments();
      return { error: null };
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message
      });
      return { error };
    }
  };

  const deleteDocument = async (documentId: string, filePath: string) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (dbError) throw dbError;

      toast({
        title: "Document supprimé",
        description: "Le document a été supprimé avec succès"
      });

      fetchDocuments();
      return { error: null };
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message
      });
      return { error };
    }
  };

  return {
    documents,
    loading,
    uploadDocument,
    signDocument,
    deleteDocument,
    refetch: fetchDocuments
  };
};
