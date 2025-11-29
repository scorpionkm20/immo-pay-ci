import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useManagementSpaces } from './useManagementSpaces';

export interface RevenueData {
  month: string;
  revenus: number;
  paiements_recus: number;
  paiements_attente: number;
}

export interface PropertyOccupancy {
  total_properties: number;
  occupied_properties: number;
  available_properties: number;
  occupancy_rate: number;
}

export interface PaymentStats {
  total_en_attente: number;
  total_complete: number;
  total_echoue: number;
  montant_en_attente: number;
  montant_recu: number;
}

export const useAnalytics = () => {
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [occupancy, setOccupancy] = useState<PropertyOccupancy>({
    total_properties: 0,
    occupied_properties: 0,
    available_properties: 0,
    occupancy_rate: 0
  });
  const [paymentStats, setPaymentStats] = useState<PaymentStats>({
    total_en_attente: 0,
    total_complete: 0,
    total_echoue: 0,
    montant_en_attente: 0,
    montant_recu: 0
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { currentSpace } = useManagementSpaces();

  useEffect(() => {
    if (currentSpace) {
      fetchAnalytics();
    }
  }, [currentSpace]);

  const fetchAnalytics = async () => {
    if (!currentSpace) return;
    
    setLoading(true);
    try {
      await Promise.all([
        fetchRevenueData(),
        fetchOccupancyData(),
        fetchPaymentStats()
      ]);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les analytics"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRevenueData = async () => {
    if (!currentSpace) return;

    // Récupérer les paiements des 12 derniers mois
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const { data: payments, error } = await supabase
      .from('payments')
      .select('montant, statut, mois_paiement, created_at')
      .eq('space_id', currentSpace.id)
      .gte('mois_paiement', twelveMonthsAgo.toISOString().split('T')[0])
      .order('mois_paiement', { ascending: true });

    if (error) throw error;

    // Grouper par mois
    const monthlyData = new Map<string, RevenueData>();
    
    payments?.forEach(payment => {
      const date = new Date(payment.mois_paiement);
      const monthKey = date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'short' });
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          month: monthKey,
          revenus: 0,
          paiements_recus: 0,
          paiements_attente: 0
        });
      }
      
      const data = monthlyData.get(monthKey)!;
      
      if (payment.statut === 'complete') {
        data.revenus += Number(payment.montant);
        data.paiements_recus += Number(payment.montant);
      } else if (payment.statut === 'en_attente') {
        data.paiements_attente += Number(payment.montant);
      }
    });

    setRevenueData(Array.from(monthlyData.values()));
  };

  const fetchOccupancyData = async () => {
    if (!currentSpace) return;

    const { data: properties, error } = await supabase
      .from('properties')
      .select('id, statut')
      .eq('space_id', currentSpace.id);

    if (error) throw error;

    const total = properties?.length || 0;
    const occupied = properties?.filter(p => p.statut === 'loue').length || 0;
    const available = properties?.filter(p => p.statut === 'disponible').length || 0;
    const occupancy_rate = total > 0 ? (occupied / total) * 100 : 0;

    setOccupancy({
      total_properties: total,
      occupied_properties: occupied,
      available_properties: available,
      occupancy_rate: Math.round(occupancy_rate * 10) / 10
    });
  };

  const fetchPaymentStats = async () => {
    if (!currentSpace) return;

    const { data: payments, error } = await supabase
      .from('payments')
      .select('montant, statut')
      .eq('space_id', currentSpace.id);

    if (error) throw error;

    const stats = payments?.reduce((acc, payment) => {
      const montant = Number(payment.montant);
      
      switch (payment.statut) {
        case 'en_attente':
          acc.total_en_attente++;
          acc.montant_en_attente += montant;
          break;
        case 'complete':
          acc.total_complete++;
          acc.montant_recu += montant;
          break;
        case 'echoue':
          acc.total_echoue++;
          break;
      }
      
      return acc;
    }, {
      total_en_attente: 0,
      total_complete: 0,
      total_echoue: 0,
      montant_en_attente: 0,
      montant_recu: 0
    } as PaymentStats) || paymentStats;

    setPaymentStats(stats);
  };

  return {
    revenueData,
    occupancy,
    paymentStats,
    loading,
    refetch: fetchAnalytics
  };
};
