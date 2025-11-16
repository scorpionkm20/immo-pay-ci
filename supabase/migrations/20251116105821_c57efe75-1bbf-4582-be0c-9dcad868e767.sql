-- Supprimer le trigger qui ajoute automatiquement le créateur comme membre
-- Ce trigger est en conflit avec notre fonction RPC create_new_space
DROP TRIGGER IF EXISTS auto_add_creator_to_space ON public.management_spaces;
DROP TRIGGER IF EXISTS on_management_space_created ON public.management_spaces;
DROP TRIGGER IF EXISTS handle_new_space ON public.management_spaces;

-- Supprimer la fonction trigger qui n'est plus nécessaire
DROP FUNCTION IF EXISTS public.auto_add_creator_to_space() CASCADE;