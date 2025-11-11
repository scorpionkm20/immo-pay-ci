import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SpaceStats {
  totalProperties: number;
  occupiedProperties: number;
  occupancyRate: number;
  monthlyRevenue: number;
  expectedRevenue: number;
  activeTickets: number;
  pendingPayments: number;
  totalTenants: number;
}

export interface PropertyPerformance {
  propertyId: string;
  propertyTitle: string;
  revenue: number;
  occupancyDays: number;
  ticketCount: number;
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
  expected: number;
}

export const useSpaceStats = (spaceId: string | null) => {
  const [stats, setStats] = useState<SpaceStats | null>(null);
  const [propertyPerformance, setPropertyPerformance] = useState<PropertyPerformance[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchStats = async () => {
    if (!spaceId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch properties stats
      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select('id, titre, statut, prix_mensuel')
        .eq('space_id', spaceId);

      if (propertiesError) throw propertiesError;

      const totalProperties = properties?.length || 0;
      const occupiedProperties = properties?.filter(p => p.statut === 'loue').length || 0;
      const occupancyRate = totalProperties > 0 ? (occupiedProperties / totalProperties) * 100 : 0;

      // Fetch active leases for revenue
      const { data: leases, error: leasesError } = await supabase
        .from('leases')
        .select('id, montant_mensuel, statut')
        .eq('space_id', spaceId)
        .eq('statut', 'actif');

      if (leasesError) throw leasesError;

      const totalTenants = leases?.length || 0;
      const expectedRevenue = leases?.reduce((sum, lease) => sum + Number(lease.montant_mensuel), 0) || 0;

      // Fetch this month's payments
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('montant, statut')
        .eq('space_id', spaceId)
        .gte('mois_paiement', startOfMonth.toISOString());

      if (paymentsError) throw paymentsError;

      const monthlyRevenue = payments
        ?.filter(p => p.statut === 'paye')
        .reduce((sum, payment) => sum + Number(payment.montant), 0) || 0;

      const pendingPayments = payments?.filter(p => p.statut === 'en_attente').length || 0;

      // Fetch active tickets
      const { data: tickets, error: ticketsError } = await supabase
        .from('maintenance_tickets')
        .select('id')
        .eq('space_id', spaceId)
        .in('statut', ['ouvert', 'en_cours']);

      if (ticketsError) throw ticketsError;

      const activeTickets = tickets?.length || 0;

      setStats({
        totalProperties,
        occupiedProperties,
        occupancyRate,
        monthlyRevenue,
        expectedRevenue,
        activeTickets,
        pendingPayments,
        totalTenants,
      });

      // Fetch property performance
      await fetchPropertyPerformance(spaceId);
      
      // Fetch monthly revenue trend
      await fetchMonthlyRevenue(spaceId);

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les statistiques"
      });
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPropertyPerformance = async (spaceId: string) => {
    try {
      const { data: properties } = await supabase
        .from('properties')
        .select('id, titre')
        .eq('space_id', spaceId);

      if (!properties) return;

      const performance: PropertyPerformance[] = await Promise.all(
        properties.map(async (property) => {
          // Get revenue from leases
          const { data: leases } = await supabase
            .from('leases')
            .select('id, montant_mensuel')
            .eq('property_id', property.id)
            .eq('statut', 'actif');

          const revenue = leases?.reduce((sum, lease) => sum + Number(lease.montant_mensuel), 0) || 0;

          // Get ticket count - only if we have leases
          let ticketCount = 0;
          if (leases && leases.length > 0) {
            const { data: tickets } = await supabase
              .from('maintenance_tickets')
              .select('id')
              .eq('lease_id', leases[0].id)
              .eq('space_id', spaceId);
            ticketCount = tickets?.length || 0;
          }

          return {
            propertyId: property.id,
            propertyTitle: property.titre,
            revenue,
            occupancyDays: 30, // Simplified
            ticketCount,
          };
        })
      );

      setPropertyPerformance(performance);
    } catch (error) {
      console.error('Error fetching property performance:', error);
    }
  };

  const fetchMonthlyRevenue = async (spaceId: string) => {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: payments } = await supabase
        .from('payments')
        .select('montant, statut, mois_paiement')
        .eq('space_id', spaceId)
        .gte('mois_paiement', sixMonthsAgo.toISOString())
        .order('mois_paiement', { ascending: true });

      if (!payments) return;

      // Group by month
      const monthlyData: { [key: string]: { revenue: number; expected: number } } = {};

      payments.forEach((payment) => {
        const month = new Date(payment.mois_paiement).toLocaleDateString('fr-FR', { 
          year: 'numeric', 
          month: 'short' 
        });
        
        if (!monthlyData[month]) {
          monthlyData[month] = { revenue: 0, expected: 0 };
        }

        monthlyData[month].expected += Number(payment.montant);
        if (payment.statut === 'paye') {
          monthlyData[month].revenue += Number(payment.montant);
        }
      });

      const revenueData = Object.entries(monthlyData).map(([month, data]) => ({
        month,
        revenue: data.revenue,
        expected: data.expected,
      }));

      setMonthlyRevenue(revenueData);
    } catch (error) {
      console.error('Error fetching monthly revenue:', error);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [spaceId]);

  return {
    stats,
    propertyPerformance,
    monthlyRevenue,
    loading,
    refetch: fetchStats,
  };
};
