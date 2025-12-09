-- Enable realtime for maintenance_tickets table
ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_tickets;

-- Create a function to notify users when ticket status changes
CREATE OR REPLACE FUNCTION public.notify_ticket_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_lease RECORD;
  v_ticket_title TEXT;
  v_notification_title TEXT;
  v_notification_message TEXT;
BEGIN
  -- Only trigger on status change
  IF OLD.statut IS DISTINCT FROM NEW.statut THEN
    v_ticket_title := NEW.titre;
    
    -- Get lease info to find the tenant
    SELECT * INTO v_lease FROM public.leases WHERE id = NEW.lease_id;
    
    -- Create notification message based on new status
    CASE NEW.statut
      WHEN 'en_cours' THEN
        v_notification_title := 'Ticket en cours de traitement';
        v_notification_message := 'Votre ticket "' || v_ticket_title || '" est maintenant en cours de traitement.';
      WHEN 'resolu' THEN
        v_notification_title := 'Ticket résolu';
        v_notification_message := 'Votre ticket "' || v_ticket_title || '" a été résolu.';
      WHEN 'ferme' THEN
        v_notification_title := 'Ticket fermé';
        v_notification_message := 'Votre ticket "' || v_ticket_title || '" a été fermé.';
      ELSE
        v_notification_title := 'Mise à jour du ticket';
        v_notification_message := 'Le statut de votre ticket "' || v_ticket_title || '" a été mis à jour.';
    END CASE;
    
    -- Create notification for the tenant who created the ticket
    INSERT INTO public.notifications (user_id, lease_id, type, titre, message)
    VALUES (NEW.created_by, NEW.lease_id, 'mise_a_jour_ticket', v_notification_title, v_notification_message);
    
    -- If the status change is made by gestionnaire, also notify them for their records
    IF v_lease.gestionnaire_id IS NOT NULL AND v_lease.gestionnaire_id != NEW.created_by THEN
      INSERT INTO public.notifications (user_id, lease_id, type, titre, message)
      VALUES (v_lease.gestionnaire_id, NEW.lease_id, 'mise_a_jour_ticket', 'Ticket mis à jour', 'Le ticket "' || v_ticket_title || '" a été mis à jour vers le statut: ' || NEW.statut);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger
DROP TRIGGER IF EXISTS on_ticket_status_change ON public.maintenance_tickets;
CREATE TRIGGER on_ticket_status_change
  AFTER UPDATE ON public.maintenance_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_ticket_status_change();