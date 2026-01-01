import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DistributionConfig {
  id: string;
  space_id: string;
  proprietaire_nom: string;
  proprietaire_telephone: string;
  proprietaire_operateur: string;
  proprietaire_pourcentage: number;
  gestionnaire_nom: string;
  gestionnaire_telephone: string;
  gestionnaire_operateur: string;
  gestionnaire_pourcentage: number;
  demarcheur_nom?: string;
  demarcheur_telephone?: string;
  demarcheur_operateur?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface PaymentDistribution {
  id: string;
  payment_id: string;
  space_id: string;
  type_distribution: 'caution' | 'loyer';
  montant_total: number;
  montant_proprietaire: number;
  telephone_proprietaire?: string;
  operateur_proprietaire?: string;
  statut_proprietaire: string;
  transaction_id_proprietaire?: string;
  montant_gestionnaire: number;
  telephone_gestionnaire?: string;
  operateur_gestionnaire?: string;
  statut_gestionnaire: string;
  transaction_id_gestionnaire?: string;
  montant_demarcheur?: number;
  telephone_demarcheur?: string;
  operateur_demarcheur?: string;
  statut_demarcheur?: string;
  transaction_id_demarcheur?: string;
  detail_caution?: {
    avance_2_mois: number;
    part_proprietaire_avance: number;
    part_gestionnaire_avance: number;
    garantie_2_mois: number;
    demarcheur_1_mois: number;
  };
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const useDistributionConfig = (spaceId: string | undefined) => {
  return useQuery({
    queryKey: ['distribution-config', spaceId],
    queryFn: async () => {
      if (!spaceId) return null;
      
      const { data, error } = await supabase
        .from('payment_distribution_config')
        .select('*')
        .eq('space_id', spaceId)
        .maybeSingle();
      
      if (error) throw error;
      return data as DistributionConfig | null;
    },
    enabled: !!spaceId
  });
};

export const usePaymentDistributions = (spaceId: string | undefined) => {
  return useQuery({
    queryKey: ['payment-distributions', spaceId],
    queryFn: async () => {
      if (!spaceId) return [];
      
      const { data, error } = await supabase
        .from('payment_distributions')
        .select('*')
        .eq('space_id', spaceId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PaymentDistribution[];
    },
    enabled: !!spaceId
  });
};

export const useSaveDistributionConfig = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (config: Omit<DistributionConfig, 'id' | 'created_at' | 'updated_at'>) => {
      // Check if config exists
      const { data: existing } = await supabase
        .from('payment_distribution_config')
        .select('id')
        .eq('space_id', config.space_id)
        .maybeSingle();
      
      if (existing) {
        // Update
        const { data, error } = await supabase
          .from('payment_distribution_config')
          .update({
            ...config,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        // Insert
        const { data, error } = await supabase
          .from('payment_distribution_config')
          .insert(config)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['distribution-config', variables.space_id] });
      toast.success('Configuration de distribution sauvegardée');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });
};

export const useCalculateDistribution = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (paymentId: string) => {
      const { data, error } = await supabase.functions.invoke('calculate-payment-distribution', {
        body: { payment_id: paymentId }
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      return data.distribution;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-distributions'] });
      toast.success('Distribution calculée et enregistrée');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });
};

export const useUpdateDistributionStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      distributionId,
      recipient,
      status,
      transactionId
    }: {
      distributionId: string;
      recipient: 'proprietaire' | 'gestionnaire' | 'demarcheur';
      status: string;
      transactionId?: string;
    }) => {
      const updateData: Record<string, string | undefined> = {
        [`statut_${recipient}`]: status
      };
      
      if (transactionId) {
        updateData[`transaction_id_${recipient}`] = transactionId;
      }
      
      const { data, error } = await supabase
        .from('payment_distributions')
        .update(updateData)
        .eq('id', distributionId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-distributions'] });
      toast.success('Statut de distribution mis à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });
};
