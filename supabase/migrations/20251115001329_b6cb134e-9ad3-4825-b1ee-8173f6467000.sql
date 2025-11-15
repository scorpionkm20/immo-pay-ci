-- Supprimer l'ancien rôle admin
DELETE FROM user_roles WHERE role = 'admin'::app_role;

-- Fonction pour attribuer automatiquement le rôle admin au compte spécifique
CREATE OR REPLACE FUNCTION auto_assign_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email = 'scorpionkm@outlook.fr' THEN
    INSERT INTO user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Créer le trigger pour attribution automatique
DROP TRIGGER IF EXISTS auto_assign_admin_on_signup ON auth.users;
CREATE TRIGGER auto_assign_admin_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_admin_role();

-- Si le compte scorpionkm@outlook.fr existe déjà, lui donner le rôle admin immédiatement
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'scorpionkm@outlook.fr'
ON CONFLICT (user_id, role) DO NOTHING;