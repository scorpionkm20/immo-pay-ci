import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface RejectionTemplate {
  id: string;
  space_id: string;
  created_by: string;
  nom: string;
  message: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export const useRejectionTemplates = (spaceId?: string) => {
  const [templates, setTemplates] = useState<RejectionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTemplates = async () => {
    if (!spaceId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('rejection_templates')
      .select('*')
      .eq('space_id', spaceId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les modèles de réponse"
      });
    } else {
      setTemplates(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTemplates();
  }, [spaceId]);

  const createTemplate = async (templateData: {
    nom: string;
    message: string;
    is_default?: boolean;
  }) => {
    if (!spaceId) return { data: null, error: new Error('Space ID required') };

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Vous devez être connecté"
      });
      return { data: null, error: new Error('Not authenticated') };
    }

    const { data, error } = await supabase
      .from('rejection_templates')
      .insert([{
        space_id: spaceId,
        created_by: user.id,
        ...templateData
      }])
      .select()
      .single();

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message
      });
      return { data: null, error };
    }

    toast({
      title: "Modèle créé",
      description: "Le modèle de réponse a été créé avec succès"
    });

    fetchTemplates();
    return { data, error: null };
  };

  const updateTemplate = async (id: string, updates: {
    nom?: string;
    message?: string;
    is_default?: boolean;
  }) => {
    const { data, error } = await supabase
      .from('rejection_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message
      });
      return { data: null, error };
    }

    toast({
      title: "Modèle mis à jour",
      description: "Le modèle a été modifié avec succès"
    });

    fetchTemplates();
    return { data, error: null };
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase
      .from('rejection_templates')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message
      });
      return { error };
    }

    toast({
      title: "Modèle supprimé",
      description: "Le modèle a été supprimé avec succès"
    });

    fetchTemplates();
    return { error: null };
  };

  const createDefaultTemplates = async () => {
    if (!spaceId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const defaultTemplates = [
      {
        space_id: spaceId,
        created_by: user.id,
        nom: "Dossier incomplet",
        message: "Votre dossier de candidature est incomplet. Merci de fournir tous les documents requis.",
        is_default: true
      },
      {
        space_id: spaceId,
        created_by: user.id,
        nom: "Propriété déjà louée",
        message: "Cette propriété a déjà été attribuée à un autre locataire.",
        is_default: true
      },
      {
        space_id: spaceId,
        created_by: user.id,
        nom: "Profil non compatible",
        message: "Après examen de votre dossier, nous ne pouvons malheureusement pas donner suite à votre demande.",
        is_default: true
      }
    ];

    await supabase.from('rejection_templates').insert(defaultTemplates);
    fetchTemplates();
  };

  return {
    templates,
    loading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    createDefaultTemplates,
    refetch: fetchTemplates
  };
};
