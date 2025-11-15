-- Supprimer les anciennes politiques restrictives sur user_roles
DROP POLICY IF EXISTS "Only system can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;

-- Permettre aux admins de voir tous les rôles
CREATE POLICY "Admins can view all roles" ON user_roles
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Permettre aux admins d'insérer des rôles
CREATE POLICY "Admins can insert roles" ON user_roles
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Permettre aux admins de mettre à jour des rôles
CREATE POLICY "Admins can update roles" ON user_roles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Permettre aux admins de supprimer des rôles
CREATE POLICY "Admins can delete roles" ON user_roles
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Permettre aux utilisateurs de voir leurs propres rôles
CREATE POLICY "Users can view their own roles" ON user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Table pour l'historique des changements de rôles
CREATE TABLE IF NOT EXISTS user_role_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  old_role app_role,
  new_role app_role NOT NULL,
  changed_by UUID NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reason TEXT
);

ALTER TABLE user_role_history ENABLE ROW LEVEL SECURITY;

-- Politique pour que les admins puissent voir l'historique
CREATE POLICY "Admins can view role history" ON user_role_history
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Fonction pour enregistrer les changements de rôles
CREATE OR REPLACE FUNCTION log_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO user_role_history (user_id, old_role, new_role, changed_by)
    VALUES (NEW.user_id, NULL, NEW.role, auth.uid());
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO user_role_history (user_id, old_role, new_role, changed_by)
    VALUES (NEW.user_id, OLD.role, NEW.role, auth.uid());
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO user_role_history (user_id, old_role, new_role, changed_by)
    VALUES (OLD.user_id, OLD.role, NULL, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger pour enregistrer automatiquement les changements
DROP TRIGGER IF EXISTS log_role_changes ON user_roles;
CREATE TRIGGER log_role_changes
  AFTER INSERT OR UPDATE OR DELETE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION log_role_change();