import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Lease {
  id: string;
  property_id: string;
  locataire_id: string;
  gestionnaire_id: string;
  date_debut: string;
  date_fin: string | null;
  montant_mensuel: number;
  caution_payee: boolean;
  caution_montant: number;
  statut: string;
  contrat_url: string | null;
  created_at: string;
  updated_at: string;
}

export const useLeases = () => {
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchLeases = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('leases')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les baux"
      });
    } else {
      setLeases(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLeases();

    // Set up realtime subscription
    const channel = supabase
      .channel('leases-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leases'
        },
        () => {
          fetchLeases();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const createLease = async (leaseData: {
    property_id: string;
    locataire_id: string;
    gestionnaire_id: string;
    date_debut: string;
    date_fin?: string;
    montant_mensuel: number;
    caution_montant: number;
    caution_payee: boolean;
  }) => {
    const { data, error } = await supabase
      .from('leases')
      .insert([{
        ...leaseData,
        statut: 'actif'
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
      title: "Bail créé",
      description: "Le bail a été attribué avec succès"
    });

    return { data, error: null };
  };

  const updateLease = async (id: string, updates: Partial<Lease>) => {
    const { error } = await supabase
      .from('leases')
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
      title: "Bail mis à jour",
      description: "Les modifications ont été enregistrées"
    });

    return { error: null };
  };

  const terminateLease = async (id: string) => {
    const { error } = await supabase
      .from('leases')
      .update({ statut: 'termine', date_fin: new Date().toISOString().split('T')[0] })
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
      title: "Bail terminé",
      description: "Le bail a été clôturé"
    });

    return { error: null };
  };

  return {
    leases,
    loading,
    createLease,
    updateLease,
    terminateLease,
    refetch: fetchLeases
  };
};
