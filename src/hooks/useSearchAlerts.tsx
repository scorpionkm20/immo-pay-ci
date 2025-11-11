import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SearchAlert {
  id: string;
  user_id: string;
  nom_alerte: string;
  actif: boolean;
  frequence: 'instantane' | 'quotidien' | 'hebdomadaire';
  ville?: string;
  quartier?: string;
  type_propriete?: string;
  prix_min?: number;
  prix_max?: number;
  surface_min?: number;
  surface_max?: number;
  nombre_pieces_min?: number;
  nombre_pieces_max?: number;
  equipements?: string[];
  derniere_verification?: string;
  derniere_notification?: string;
  nombre_notifications: number;
  created_at: string;
  updated_at: string;
}

export const useSearchAlerts = () => {
  const [alerts, setAlerts] = useState<SearchAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('search_alerts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching alerts:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les alertes"
      });
    } else {
      setAlerts((data || []) as SearchAlert[]);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchAlerts();

    const channel = supabase
      .channel('search-alerts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'search_alerts'
        },
        () => {
          fetchAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAlerts]);

  const createAlert = async (alertData: Omit<SearchAlert, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'nombre_notifications' | 'derniere_verification' | 'derniere_notification'>) => {
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
      .from('search_alerts')
      .insert([{ ...alertData, user_id: user.id }])
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
      title: "Alerte créée",
      description: "Vous serez notifié quand une propriété correspondra"
    });

    return { data, error: null };
  };

  const updateAlert = async (id: string, updates: Partial<SearchAlert>) => {
    const { error } = await supabase
      .from('search_alerts')
      .update(updates)
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
      title: "Alerte mise à jour"
    });

    return { error: null };
  };

  const toggleAlert = async (id: string, actif: boolean) => {
    return updateAlert(id, { actif });
  };

  const deleteAlert = async (id: string) => {
    const { error } = await supabase
      .from('search_alerts')
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
      title: "Alerte supprimée"
    });

    return { error: null };
  };

  return {
    alerts,
    loading,
    createAlert,
    updateAlert,
    toggleAlert,
    deleteAlert,
    refetch: fetchAlerts
  };
};
