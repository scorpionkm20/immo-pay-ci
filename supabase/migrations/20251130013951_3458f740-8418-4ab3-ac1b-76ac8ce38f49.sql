-- Drop and recreate audit_stats view without SECURITY DEFINER
DROP VIEW IF EXISTS public.audit_stats;

CREATE VIEW public.audit_stats AS
SELECT
  action,
  resource_type,
  COUNT(*) as count,
  MAX(created_at) as last_occurrence
FROM public.audit_logs
GROUP BY action, resource_type;