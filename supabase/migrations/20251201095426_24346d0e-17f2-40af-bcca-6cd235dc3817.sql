
-- Corriger le trigger pour gérer les suppressions
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
    -- Pour DELETE, ne pas insérer dans user_role_history car new_role est NULL
    -- Juste logger dans audit_logs
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
