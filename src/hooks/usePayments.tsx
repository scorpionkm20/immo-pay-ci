import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Payment {
  id: string;
  lease_id: string;
  montant: number;
  mois_paiement: string;
  date_paiement: string;
  statut: string;
  methode_paiement: string;
  numero_telephone: string;
  transaction_id: string | null;
  recu_url: string | null;
  created_at: string;
  updated_at: string;
}

export const usePayments = (leaseId?: string) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPayments = async () => {
    setLoading(true);
    let query = supabase
      .from('payments')
      .select('*')
      .order('mois_paiement', { ascending: false });

    if (leaseId) {
      query = query.eq('lease_id', leaseId);
    }

    const { data, error } = await query;

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les paiements"
      });
    } else {
      setPayments(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPayments();

    // Set up realtime subscription
    const channel = supabase
      .channel('payments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments'
        },
        () => {
          fetchPayments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leaseId]);

  const createPayment = async (paymentData: {
    lease_id: string;
    montant: number;
    mois_paiement: string;
    methode_paiement: string;
    numero_telephone: string;
  }) => {
    const { data, error } = await supabase.functions.invoke('initiate-payment', {
      body: paymentData
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message
      });
      return { data: null, error };
    }

    // Check if simulation mode
    if (data?.simulation_mode) {
      toast({
        title: "Mode Simulation",
        description: "Le paiement sera validé automatiquement (pas de vraie transaction)",
        variant: "default"
      });
    } else {
      toast({
        title: "Paiement initié",
        description: "Veuillez suivre les instructions sur votre téléphone"
      });
    }

    return { data, error: null };
  };

  const downloadReceipt = async (paymentId: string) => {
    const { data, error } = await supabase.functions.invoke('generate-receipt', {
      body: { payment_id: paymentId }
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de générer le reçu"
      });
      return;
    }

    toast({
      title: "Reçu généré",
      description: "Le reçu a été téléchargé"
    });

    return data;
  };

  return {
    payments,
    loading,
    createPayment,
    downloadReceipt,
    refetch: fetchPayments
  };
};
