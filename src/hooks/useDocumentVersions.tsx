import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  file_url: string;
  file_name: string;
  file_size: number;
  modified_by: string;
  modification_type: string;
  changes_description: string | null;
  created_at: string;
}

export const useDocumentVersions = (documentId?: string) => {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (documentId) {
      fetchVersions();
    }
  }, [documentId]);

  const fetchVersions = async () => {
    if (!documentId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('document_versions')
        .select('*')
        .eq('document_id', documentId)
        .order('version_number', { ascending: false });

      if (error) throw error;
      setVersions(data || []);
    } catch (error: any) {
      console.error('Error fetching versions:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de charger l\'historique des versions',
      });
    }
    setLoading(false);
  };

  const getVersionIcon = (modificationType: string) => {
    switch (modificationType) {
      case 'created':
        return '📄';
      case 'updated':
        return '✏️';
      case 'signed':
        return '✅';
      case 'regenerated':
        return '🔄';
      default:
        return '📝';
    }
  };

  const getVersionLabel = (modificationType: string) => {
    switch (modificationType) {
      case 'created':
        return 'Création';
      case 'updated':
        return 'Modification';
      case 'signed':
        return 'Signature';
      case 'regenerated':
        return 'Régénération';
      default:
        return 'Modification';
    }
  };

  return {
    versions,
    loading,
    refetch: fetchVersions,
    getVersionIcon,
    getVersionLabel,
  };
};
