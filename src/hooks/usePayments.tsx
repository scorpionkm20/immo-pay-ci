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
    
    // FILTRAGE (Unicité du Contenu) : Toujours filtrer via RLS + lease_id
    let query = supabase
      .from('payments')
      .select('*')
      .order('mois_paiement', { ascending: false });

    if (leaseId) {
      // Filtrer par bail spécifique (l'utilisateur a déjà accès via RLS)
      query = query.eq('lease_id', leaseId);
    }
    // Si pas de leaseId, RLS filtre automatiquement par space_id

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

    // Set up realtime subscription with toast notifications
    const channel = supabase
      .channel('payments-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payments'
        },
        (payload) => {
          const newPayment = payload.new as Payment;
          
          // Show notification based on status change
          if (newPayment.statut === 'complete') {
            toast({
              title: "✅ Paiement réussi",
              description: `Paiement de ${newPayment.montant.toLocaleString()} FCFA confirmé`,
            });
          } else if (newPayment.statut === 'echoue') {
            toast({
              variant: "destructive",
              title: "❌ Paiement échoué",
              description: "Le paiement n'a pas pu être traité",
            });
          } else if (newPayment.statut === 'en_cours') {
            toast({
              title: "⏳ Paiement en cours",
              description: "Votre paiement est en cours de traitement",
            });
          }
          
          fetchPayments();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
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
  }, [leaseId, toast]);

  const createPayment = async (paymentData: {
    lease_id: string;
    montant: number;
    mois_paiement: string;
    methode_paiement: string;
    numero_telephone: string;
  }): Promise<{ data: any; error: { message: string; code?: string } | null }> => {
    try {
      const { data, error } = await supabase.functions.invoke('initiate-payment', {
        body: paymentData
      });

      if (error) {
        // Extract detailed error message
        let errorMessage = error.message || "Une erreur est survenue";
        let errorCode = undefined;
        
        // Try to parse JSON error from edge function
        try {
          const parsed = JSON.parse(error.message);
          errorMessage = parsed.error || parsed.message || errorMessage;
          errorCode = parsed.code;
        } catch {
          // If not JSON, use as-is
        }

        toast({
          variant: "destructive",
          title: "Erreur de paiement",
          description: errorMessage
        });
        return { data: null, error: { message: errorMessage, code: errorCode } };
      }

      // Check for error in response body
      if (data?.error) {
        toast({
          variant: "destructive",
          title: "Erreur de paiement",
          description: data.error
        });
        return { data: null, error: { message: data.error } };
      }

      // Success cases
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
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur réseau, veuillez réessayer";
      toast({
        variant: "destructive",
        title: "Erreur",
        description: errorMessage
      });
      return { data: null, error: { message: errorMessage } };
    }
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
