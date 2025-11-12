import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PropertyCharge {
  id: string;
  property_id: string;
  type_charge: string;
  montant: number;
  date_charge: string;
  description?: string;
  recurrent: boolean;
  frequence?: string;
}

interface PropertyAmortization {
  id: string;
  property_id: string;
  valeur_acquisition: number;
  date_acquisition: string;
  duree_amortissement: number;
  valeur_residuelle: number;
}

interface PaymentReminder {
  id: string;
  payment_id: string;
  type_relance: string;
  date_relance: string;
  message: string;
  statut: string;
}

interface FinancialMetrics {
  totalRevenue: number;
  totalCharges: number;
  netProfit: number;
  profitMargin: number;
  overduePayments: number;
  overdueAmount: number;
}

export const useFinancialData = (spaceId?: string) => {
  const [charges, setCharges] = useState<PropertyCharge[]>([]);
  const [amortizations, setAmortizations] = useState<PropertyAmortization[]>([]);
  const [reminders, setReminders] = useState<PaymentReminder[]>([]);
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCharges = async () => {
    if (!spaceId) return;

    try {
      const { data, error } = await supabase
        .from('property_charges')
        .select('*')
        .eq('space_id', spaceId)
        .order('date_charge', { ascending: false });

      if (error) throw error;
      setCharges(data || []);
    } catch (error: any) {
      console.error('Erreur lors du chargement des charges:', error);
      toast.error('Impossible de charger les charges');
    }
  };

  const fetchAmortizations = async () => {
    if (!spaceId) return;

    try {
      const { data, error } = await supabase
        .from('property_amortization')
        .select('*')
        .eq('space_id', spaceId);

      if (error) throw error;
      setAmortizations(data || []);
    } catch (error: any) {
      console.error('Erreur lors du chargement des amortissements:', error);
    }
  };

  const fetchReminders = async () => {
    if (!spaceId) return;

    try {
      const { data, error } = await supabase
        .from('payment_reminders')
        .select('*')
        .eq('space_id', spaceId)
        .order('date_relance', { ascending: false });

      if (error) throw error;
      setReminders(data || []);
    } catch (error: any) {
      console.error('Erreur lors du chargement des relances:', error);
    }
  };

  const calculateMetrics = async () => {
    if (!spaceId) return;

    try {
      // Récupérer les paiements
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('montant, statut, mois_paiement')
        .eq('space_id', spaceId);

      if (paymentsError) throw paymentsError;

      // Calculer revenus
      const totalRevenue = payments
        ?.filter(p => p.statut === 'valide')
        .reduce((sum, p) => sum + Number(p.montant), 0) || 0;

      // Calculer charges
      const totalCharges = charges.reduce((sum, c) => sum + Number(c.montant), 0);

      // Calculer impayés
      const now = new Date();
      const overduePayments = payments?.filter(p => {
        if (p.statut !== 'en_attente') return false;
        const paymentDate = new Date(p.mois_paiement);
        return paymentDate < now;
      }) || [];

      const overdueAmount = overduePayments.reduce((sum, p) => sum + Number(p.montant), 0);

      const netProfit = totalRevenue - totalCharges;
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      setMetrics({
        totalRevenue,
        totalCharges,
        netProfit,
        profitMargin,
        overduePayments: overduePayments.length,
        overdueAmount,
      });
    } catch (error: any) {
      console.error('Erreur lors du calcul des métriques:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchCharges(),
        fetchAmortizations(),
        fetchReminders(),
      ]);
      await calculateMetrics();
      setLoading(false);
    };

    loadData();
  }, [spaceId]);

  const addCharge = async (charge: Omit<PropertyCharge, 'id'>) => {
    if (!spaceId) return;

    try {
      const { error } = await supabase
        .from('property_charges')
        .insert({ ...charge, space_id: spaceId });

      if (error) throw error;

      toast.success('Charge ajoutée avec succès');
      await fetchCharges();
      await calculateMetrics();
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error('Impossible d\'ajouter la charge');
    }
  };

  const deleteCharge = async (chargeId: string) => {
    try {
      const { error } = await supabase
        .from('property_charges')
        .delete()
        .eq('id', chargeId);

      if (error) throw error;

      toast.success('Charge supprimée');
      await fetchCharges();
      await calculateMetrics();
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error('Impossible de supprimer la charge');
    }
  };

  const addAmortization = async (amortization: Omit<PropertyAmortization, 'id'>) => {
    if (!spaceId) return;

    try {
      const { error } = await supabase
        .from('property_amortization')
        .insert({ ...amortization, space_id: spaceId });

      if (error) throw error;

      toast.success('Amortissement ajouté avec succès');
      await fetchAmortizations();
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error('Impossible d\'ajouter l\'amortissement');
    }
  };

  const createReminder = async (paymentId: string, type: string, message: string) => {
    if (!spaceId) return;

    try {
      const { error } = await supabase
        .from('payment_reminders')
        .insert({
          payment_id: paymentId,
          space_id: spaceId,
          type_relance: type,
          message,
        });

      if (error) throw error;

      toast.success('Relance créée avec succès');
      await fetchReminders();
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error('Impossible de créer la relance');
    }
  };

  const calculateAmortization = (amortization: PropertyAmortization, year: number) => {
    const annualAmount = (amortization.valeur_acquisition - amortization.valeur_residuelle) / amortization.duree_amortissement;
    const cumulatedAmount = annualAmount * year;
    const remainingValue = amortization.valeur_acquisition - cumulatedAmount;

    return {
      annualAmount,
      cumulatedAmount,
      remainingValue: Math.max(remainingValue, amortization.valeur_residuelle),
    };
  };

  return {
    charges,
    amortizations,
    reminders,
    metrics,
    loading,
    addCharge,
    deleteCharge,
    addAmortization,
    createReminder,
    calculateAmortization,
    refreshData: async () => {
      await fetchCharges();
      await fetchAmortizations();
      await fetchReminders();
      await calculateMetrics();
    },
  };
};
