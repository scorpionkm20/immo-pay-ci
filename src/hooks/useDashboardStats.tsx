import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useDashboardStats = () => {
  const { user, userRole } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', user?.id, userRole],
    queryFn: async () => {
      if (!user) return null;

      if (userRole === 'gestionnaire') {
        // Stats pour gestionnaire
        const [propertiesResult, leasesResult, ticketsResult, paymentsResult, allPaymentsResult, ticketsDetailResult] = await Promise.all([
          supabase
            .from('properties')
            .select('*', { count: 'exact' })
            .eq('gestionnaire_id', user.id),
          supabase
            .from('leases')
            .select('*', { count: 'exact' })
            .eq('gestionnaire_id', user.id)
            .eq('statut', 'actif'),
          supabase
            .from('maintenance_tickets')
            .select('*, leases!inner(gestionnaire_id)', { count: 'exact' })
            .eq('leases.gestionnaire_id', user.id)
            .eq('statut', 'ouvert'),
          supabase
            .from('payments')
            .select('montant, leases!inner(gestionnaire_id)')
            .eq('leases.gestionnaire_id', user.id)
            .eq('statut', 'reussi')
            .gte('date_paiement', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
          supabase
            .from('payments')
            .select('montant, date_paiement, mois_paiement, statut, leases!inner(gestionnaire_id, property_id, properties!inner(titre))')
            .eq('leases.gestionnaire_id', user.id)
            .gte('date_paiement', new Date(new Date().getFullYear() - 1, 0, 1).toISOString())
            .order('date_paiement', { ascending: true }),
          supabase
            .from('maintenance_tickets')
            .select('statut, priorite, created_at, updated_at, leases!inner(gestionnaire_id)')
            .eq('leases.gestionnaire_id', user.id)
        ]);

        const totalRevenue = paymentsResult.data?.reduce((sum, payment) => sum + Number(payment.montant), 0) || 0;

        // Calculate monthly revenue chart data
        const monthlyRevenueData = allPaymentsResult.data?.reduce((acc: any[], payment: any) => {
          if (payment.statut !== 'reussi') return acc;
          const date = new Date(payment.date_paiement);
          const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const existing = acc.find(item => item.month === monthYear);
          if (existing) {
            existing.revenue += Number(payment.montant);
          } else {
            acc.push({ month: monthYear, revenue: Number(payment.montant) });
          }
          return acc;
        }, []).sort((a: any, b: any) => a.month.localeCompare(b.month)) || [];

        // Calculate revenue by property
        const revenueByProperty = allPaymentsResult.data?.reduce((acc: any[], payment: any) => {
          if (payment.statut !== 'reussi') return acc;
          const propertyTitle = payment.leases?.properties?.titre || 'N/A';
          const existing = acc.find(item => item.property === propertyTitle);
          if (existing) {
            existing.revenue += Number(payment.montant);
          } else {
            acc.push({ property: propertyTitle, revenue: Number(payment.montant) });
          }
          return acc;
        }, []).sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 10) || [];

        // Calculate ticket statistics
        const ticketsByStatus = ticketsDetailResult.data?.reduce((acc: any, ticket: any) => {
          acc[ticket.statut] = (acc[ticket.statut] || 0) + 1;
          return acc;
        }, {}) || {};

        const ticketsByPriority = ticketsDetailResult.data?.reduce((acc: any, ticket: any) => {
          acc[ticket.priorite] = (acc[ticket.priorite] || 0) + 1;
          return acc;
        }, {}) || {};

        // Calculate average resolution time (in hours)
        const resolvedTickets = ticketsDetailResult.data?.filter((t: any) => t.statut === 'resolu') || [];
        const avgResolutionTime = resolvedTickets.length > 0
          ? resolvedTickets.reduce((sum: number, ticket: any) => {
              const created = new Date(ticket.created_at).getTime();
              const updated = new Date(ticket.updated_at).getTime();
              return sum + (updated - created) / (1000 * 60 * 60);
            }, 0) / resolvedTickets.length
          : 0;

        // Calculate occupancy rate
        const totalProperties = propertiesResult.count || 1;
        const activeLeases = leasesResult.count || 0;
        const occupancyRate = (activeLeases / totalProperties) * 100;

        // Calculate late payments
        const latePayments = allPaymentsResult.data?.filter((p: any) => {
          if (p.statut !== 'en_attente') return false;
          const dueDate = new Date(p.mois_paiement);
          return dueDate < new Date();
        }).length || 0;

        return {
          totalProperties: propertiesResult.count || 0,
          activeLeases: leasesResult.count || 0,
          openTickets: ticketsResult.count || 0,
          monthlyRevenue: totalRevenue,
          chartData: {
            monthlyRevenue: monthlyRevenueData,
            revenueByProperty,
            ticketsByStatus: Object.entries(ticketsByStatus).map(([status, count]) => ({ status, count })),
            ticketsByPriority: Object.entries(ticketsByPriority).map(([priority, count]) => ({ priority, count })),
          },
          kpis: {
            occupancyRate: Math.round(occupancyRate),
            avgResolutionTime: Math.round(avgResolutionTime),
            latePayments,
          },
        };
      } else if (userRole === 'locataire') {
        // Stats pour locataire
        const [leasesResult, ticketsResult, paymentsResult, documentsResult] = await Promise.all([
          supabase
            .from('leases')
            .select('*', { count: 'exact' })
            .eq('locataire_id', user.id)
            .eq('statut', 'actif'),
          supabase
            .from('maintenance_tickets')
            .select('*, leases!inner(locataire_id)', { count: 'exact' })
            .eq('leases.locataire_id', user.id)
            .eq('statut', 'ouvert'),
          supabase
            .from('payments')
            .select('*, leases!inner(locataire_id)', { count: 'exact' })
            .eq('leases.locataire_id', user.id)
            .eq('statut', 'en_attente')
            .gte('mois_paiement', new Date().toISOString().split('T')[0]),
          supabase
            .from('documents')
            .select('*, leases!inner(locataire_id)', { count: 'exact' })
            .eq('leases.locataire_id', user.id)
            .eq('signe', false),
        ]);

        return {
          activeLeases: leasesResult.count || 0,
          openTickets: ticketsResult.count || 0,
          pendingPayments: paymentsResult.count || 0,
          unsignedDocuments: documentsResult.count || 0,
        };
      }

      return null;
    },
    enabled: !!user && !!userRole,
  });

  return { stats, isLoading };
};
