import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Lease {
  id: string;
  property_id: string;
  locataire_id: string;
  gestionnaire_id: string;
  space_id: string;
  date_debut: string;
  date_fin: string | null;
  montant_mensuel: number;
  caution_payee: boolean;
  caution_montant: number;
  date_caution_payee: string | null; // Date de paiement de la caution
  statut: string;
  contrat_url: string | null;
  created_at: string;
  updated_at: string;
}

// Utilitaire pour calculer la date du premier loyer (2 mois après caution)
export const getFirstRentDueDate = (dateCautionPayee: string | null): Date | null => {
  if (!dateCautionPayee) return null;
  const date = new Date(dateCautionPayee);
  date.setMonth(date.getMonth() + 2);
  return date;
};

// Utilitaire pour vérifier si le loyer est dû maintenant
export const isRentDueNow = (dateCautionPayee: string | null): boolean => {
  const firstRentDate = getFirstRentDueDate(dateCautionPayee);
  if (!firstRentDate) return false;
  return new Date() >= firstRentDate;
};

export const useLeases = (userRole?: string | null) => {
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchLeases = async () => {
    setLoading(true);
    
    // FILTRAGE (Unicité du Contenu) : Récupérer uniquement les baux de l'utilisateur connecté
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setLoading(false);
      return;
    }

    let query = supabase
      .from('leases')
      .select('*')
      .order('created_at', { ascending: false });

    // Filtrer par rôle - CRITIQUE pour la sécurité
    if (userRole === 'locataire') {
      query = query.eq('locataire_id', user.id);
    } else if (userRole === 'gestionnaire') {
      query = query.eq('gestionnaire_id', user.id);
    }
    // Les admins voient tous les baux (pas de filtre supplémentaire)

    const { data, error } = await query;

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
  }, [userRole]);

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
    // Get space_id from the property
    const { data: property } = await supabase
      .from('properties')
      .select('space_id')
      .eq('id', leaseData.property_id)
      .single();

    const { data, error } = await supabase
      .from('leases')
      .insert([{
        ...leaseData,
        space_id: property?.space_id,
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
