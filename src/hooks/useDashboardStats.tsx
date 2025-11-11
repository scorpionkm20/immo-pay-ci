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
        const [propertiesResult, leasesResult, ticketsResult, paymentsResult] = await Promise.all([
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
        ]);

        const totalRevenue = paymentsResult.data?.reduce((sum, payment) => sum + Number(payment.montant), 0) || 0;

        return {
          totalProperties: propertiesResult.count || 0,
          activeLeases: leasesResult.count || 0,
          openTickets: ticketsResult.count || 0,
          monthlyRevenue: totalRevenue,
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
