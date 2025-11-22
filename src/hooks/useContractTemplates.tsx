import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ContractTemplate {
  id: string;
  space_id: string;
  nom: string;
  description: string | null;
  content: string;
  variables: any;
  is_default: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const useContractTemplates = (spaceId?: string) => {
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (spaceId) {
      fetchTemplates();
    }
  }, [spaceId]);

  const fetchTemplates = async () => {
    if (!spaceId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contract_templates')
        .select('*')
        .eq('space_id', spaceId)
        .order('is_default', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error('Error fetching templates:', error);
    }
    setLoading(false);
  };

  const generateContract = async (leaseId: string, templateId?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-lease-contract', {
        body: { leaseId, templateId },
      });

      if (error) throw error;

      toast({
        title: 'Contrat généré',
        description: 'Le contrat de bail a été généré avec succès',
      });

      return { error: null, data };
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.message || 'Impossible de générer le contrat',
      });
      return { error };
    }
  };

  return {
    templates,
    loading,
    generateContract,
    refetch: fetchTemplates,
  };
};
