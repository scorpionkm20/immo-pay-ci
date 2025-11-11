import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export interface DashboardStats {
  totalRevenue: number;
  monthlyRevenue: number;
  occupancyRate: number;
  totalProperties: number;
  occupiedProperties: number;
  pendingPayments: number;
  latePayments: Array<{
    id: string;
    lease_id: string;
    montant: number;
    mois_paiement: string;
    locataire_name: string;
    property_title: string;
  }>;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
  }>;
}

export const useDashboardStats = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    monthlyRevenue: 0,
    occupancyRate: 0,
    totalProperties: 0,
    occupiedProperties: 0,
    pendingPayments: 0,
    latePayments: [],
    revenueByMonth: []
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get gestionnaire's properties
      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select('id, statut')
        .eq('gestionnaire_id', user.id);

      if (propertiesError) throw propertiesError;

      const totalProperties = properties?.length || 0;
      const occupiedProperties = properties?.filter(p => p.statut === 'loue').length || 0;
      const occupancyRate = totalProperties > 0 ? (occupiedProperties / totalProperties) * 100 : 0;

      // Get active leases for these properties
      const propertyIds = properties?.map(p => p.id) || [];
      const { data: leases, error: leasesError } = await supabase
        .from('leases')
        .select('id, property_id, locataire_id, montant_mensuel')
        .in('property_id', propertyIds)
        .eq('statut', 'actif');

      if (leasesError) throw leasesError;

      // Get all payments for these leases
      const leaseIds = leases?.map(l => l.id) || [];
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .in('lease_id', leaseIds);

      if (paymentsError) throw paymentsError;

      // Calculate total revenue (successful payments)
      const totalRevenue = payments
        ?.filter(p => p.statut === 'reussi')
        .reduce((sum, p) => sum + Number(p.montant), 0) || 0;

      // Calculate current month revenue
      const currentMonthStart = startOfMonth(new Date());
      const currentMonthEnd = endOfMonth(new Date());
      const monthlyRevenue = payments
        ?.filter(p => 
          p.statut === 'reussi' && 
          new Date(p.date_paiement) >= currentMonthStart &&
          new Date(p.date_paiement) <= currentMonthEnd
        )
        .reduce((sum, p) => sum + Number(p.montant), 0) || 0;

      // Calculate pending and late payments
      const today = new Date();
      const pendingPayments = payments?.filter(p => 
        p.statut === 'en_attente' || p.statut === 'en_cours'
      ).length || 0;

      // Get late payments with details
      const latePaymentsList = await Promise.all(
        payments
          ?.filter(p => {
            const paymentDate = new Date(p.mois_paiement);
            return (p.statut === 'en_attente' || p.statut === 'echoue') && paymentDate < today;
          })
          .map(async (payment) => {
            const lease = leases?.find(l => l.id === payment.lease_id);
            if (!lease) return null;

            const { data: property } = await supabase
              .from('properties')
              .select('titre')
              .eq('id', lease.property_id)
              .single();

            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', lease.locataire_id)
              .single();

            return {
              id: payment.id,
              lease_id: payment.lease_id,
              montant: Number(payment.montant),
              mois_paiement: payment.mois_paiement,
              locataire_name: profile?.full_name || 'Inconnu',
              property_title: property?.titre || 'Propriété inconnue'
            };
          }) || []
      );

      // Calculate revenue by month (last 6 months)
      const revenueByMonth = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(new Date(), i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        
        const monthRevenue = payments
          ?.filter(p => 
            p.statut === 'reussi' && 
            new Date(p.date_paiement) >= monthStart &&
            new Date(p.date_paiement) <= monthEnd
          )
          .reduce((sum, p) => sum + Number(p.montant), 0) || 0;

        revenueByMonth.push({
          month: format(monthDate, 'MMM yyyy'),
          revenue: monthRevenue
        });
      }

      setStats({
        totalRevenue,
        monthlyRevenue,
        occupancyRate,
        totalProperties,
        occupiedProperties,
        pendingPayments,
        latePayments: latePaymentsList.filter(p => p !== null) as any[],
        revenueByMonth
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les statistiques"
      });
      console.error('Error fetching dashboard stats:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return {
    stats,
    loading,
    refetch: fetchStats
  };
};
