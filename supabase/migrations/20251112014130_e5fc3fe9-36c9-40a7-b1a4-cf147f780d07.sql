-- Create trigger to automatically add space creator as member
CREATE TRIGGER trigger_auto_add_creator_to_space
  AFTER INSERT ON public.management_spaces
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_add_creator_to_space();