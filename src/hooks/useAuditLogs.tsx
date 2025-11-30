import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user_name?: string;
}

export interface AuditStats {
  action: string;
  resource_type: string;
  count: number;
  last_occurrence: string;
}

export const useAuditLogs = (limit: number = 100) => {
  return useQuery({
    queryKey: ['audit-logs', limit],
    queryFn: async () => {
      const { data: logs, error: logsError } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (logsError) throw logsError;

      // Fetch user names for the logs
      const userIds = [...new Set(logs?.map(log => log.user_id) || [])];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      const enrichedLogs = logs?.map(log => ({
        ...log,
        user_name: profileMap.get(log.user_id) || 'Utilisateur inconnu'
      })) || [];

      return enrichedLogs as AuditLog[];
    },
  });
};

export const useAuditStats = () => {
  return useQuery({
    queryKey: ['audit-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_stats')
        .select('*')
        .order('count', { ascending: false });

      if (error) throw error;
      return data as AuditStats[];
    },
  });
};
