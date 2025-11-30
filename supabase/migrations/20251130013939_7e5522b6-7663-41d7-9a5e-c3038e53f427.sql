-- Create audit_logs table for tracking critical actions
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- System can insert audit logs
CREATE POLICY "System can insert audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create helper function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit(
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    details
  ) VALUES (
    auth.uid(),
    p_action,
    p_resource_type,
    p_resource_id,
    p_details
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Update log_role_change trigger to also log to audit_logs
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log to user_role_history (existing)
  IF TG_OP = 'INSERT' THEN
    INSERT INTO user_role_history (user_id, old_role, new_role, changed_by)
    VALUES (NEW.user_id, NULL, NEW.role, auth.uid());
    
    -- Log to audit_logs
    PERFORM log_audit(
      'role_assigned',
      'user_role',
      NEW.id,
      jsonb_build_object(
        'user_id', NEW.user_id,
        'new_role', NEW.role
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO user_role_history (user_id, old_role, new_role, changed_by)
    VALUES (NEW.user_id, OLD.role, NEW.role, auth.uid());
    
    -- Log to audit_logs
    PERFORM log_audit(
      'role_updated',
      'user_role',
      NEW.id,
      jsonb_build_object(
        'user_id', NEW.user_id,
        'old_role', OLD.role,
        'new_role', NEW.role
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO user_role_history (user_id, old_role, new_role, changed_by)
    VALUES (OLD.user_id, OLD.role, NULL, auth.uid());
    
    -- Log to audit_logs
    PERFORM log_audit(
      'role_removed',
      'user_role',
      OLD.id,
      jsonb_build_object(
        'user_id', OLD.user_id,
        'old_role', OLD.role
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for rental request approvals
CREATE OR REPLACE FUNCTION public.log_rental_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.request_status = 'pending' AND NEW.request_status IN ('approved', 'rejected') THEN
    PERFORM log_audit(
      CASE 
        WHEN NEW.request_status = 'approved' THEN 'rental_request_approved'
        ELSE 'rental_request_rejected'
      END,
      'rental_request',
      NEW.id,
      jsonb_build_object(
        'property_id', NEW.property_id,
        'tenant_id', NEW.tenant_id,
        'manager_id', NEW.manager_id,
        'status', NEW.request_status
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_rental_requests
AFTER UPDATE ON public.rental_requests
FOR EACH ROW
EXECUTE FUNCTION log_rental_approval();

-- Trigger for payment status changes
CREATE OR REPLACE FUNCTION public.log_payment_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit(
      'payment_created',
      'payment',
      NEW.id,
      jsonb_build_object(
        'lease_id', NEW.lease_id,
        'montant', NEW.montant,
        'statut', NEW.statut
      )
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.statut != NEW.statut THEN
    PERFORM log_audit(
      'payment_status_changed',
      'payment',
      NEW.id,
      jsonb_build_object(
        'lease_id', NEW.lease_id,
        'montant', NEW.montant,
        'old_status', OLD.statut,
        'new_status', NEW.statut,
        'methode_paiement', NEW.methode_paiement
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_payments
AFTER INSERT OR UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION log_payment_status();

-- Create view for audit statistics
CREATE OR REPLACE VIEW public.audit_stats AS
SELECT
  action,
  resource_type,
  COUNT(*) as count,
  MAX(created_at) as last_occurrence
FROM public.audit_logs
GROUP BY action, resource_type;