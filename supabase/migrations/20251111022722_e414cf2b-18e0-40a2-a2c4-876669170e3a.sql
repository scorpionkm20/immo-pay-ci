-- Create enum for ticket status
CREATE TYPE public.ticket_status AS ENUM ('ouvert', 'en_cours', 'resolu', 'ferme');

-- Create enum for ticket priority
CREATE TYPE public.ticket_priority AS ENUM ('faible', 'moyenne', 'haute', 'urgente');

-- Create maintenance_tickets table
CREATE TABLE public.maintenance_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lease_id UUID NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  titre TEXT NOT NULL,
  description TEXT NOT NULL,
  statut ticket_status NOT NULL DEFAULT 'ouvert',
  priorite ticket_priority NOT NULL DEFAULT 'moyenne',
  photos TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create maintenance_interventions table for history
CREATE TABLE public.maintenance_interventions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.maintenance_tickets(id) ON DELETE CASCADE,
  intervenant_id UUID NOT NULL,
  description TEXT NOT NULL,
  statut_avant ticket_status,
  statut_apres ticket_status,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.maintenance_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_interventions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for maintenance_tickets
CREATE POLICY "Users can view tickets for their leases"
  ON public.maintenance_tickets
  FOR SELECT
  USING (
    lease_id IN (
      SELECT id FROM public.leases
      WHERE locataire_id = auth.uid() OR gestionnaire_id = auth.uid()
    )
  );

CREATE POLICY "Locataires can create tickets for their leases"
  ON public.maintenance_tickets
  FOR INSERT
  WITH CHECK (
    lease_id IN (
      SELECT id FROM public.leases
      WHERE locataire_id = auth.uid()
    ) AND created_by = auth.uid()
  );

CREATE POLICY "Gestionnaires can update tickets"
  ON public.maintenance_tickets
  FOR UPDATE
  USING (
    lease_id IN (
      SELECT id FROM public.leases
      WHERE gestionnaire_id = auth.uid()
    )
  );

-- RLS Policies for maintenance_interventions
CREATE POLICY "Users can view interventions for their tickets"
  ON public.maintenance_interventions
  FOR SELECT
  USING (
    ticket_id IN (
      SELECT id FROM public.maintenance_tickets
      WHERE lease_id IN (
        SELECT id FROM public.leases
        WHERE locataire_id = auth.uid() OR gestionnaire_id = auth.uid()
      )
    )
  );

CREATE POLICY "Gestionnaires can create interventions"
  ON public.maintenance_interventions
  FOR INSERT
  WITH CHECK (
    ticket_id IN (
      SELECT mt.id FROM public.maintenance_tickets mt
      JOIN public.leases l ON mt.lease_id = l.id
      WHERE l.gestionnaire_id = auth.uid()
    ) AND intervenant_id = auth.uid()
  );

-- Create trigger for updated_at
CREATE TRIGGER update_maintenance_tickets_updated_at
  BEFORE UPDATE ON public.maintenance_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_maintenance_tickets_lease_id ON public.maintenance_tickets(lease_id);
CREATE INDEX idx_maintenance_tickets_statut ON public.maintenance_tickets(statut);
CREATE INDEX idx_maintenance_interventions_ticket_id ON public.maintenance_interventions(ticket_id);

-- Create storage bucket for maintenance photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('maintenance-photos', 'maintenance-photos', false);

-- Storage policies for maintenance-photos
CREATE POLICY "Users can view photos for their tickets"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'maintenance-photos' AND
    (storage.foldername(name))[1] IN (
      SELECT mt.id::text
      FROM public.maintenance_tickets mt
      JOIN public.leases l ON mt.lease_id = l.id
      WHERE l.locataire_id = auth.uid() OR l.gestionnaire_id = auth.uid()
    )
  );

CREATE POLICY "Locataires can upload photos for their tickets"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'maintenance-photos' AND
    (storage.foldername(name))[1] IN (
      SELECT mt.id::text
      FROM public.maintenance_tickets mt
      JOIN public.leases l ON mt.lease_id = l.id
      WHERE l.locataire_id = auth.uid() AND mt.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete photos for their tickets"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'maintenance-photos' AND
    (storage.foldername(name))[1] IN (
      SELECT mt.id::text
      FROM public.maintenance_tickets mt
      JOIN public.leases l ON mt.lease_id = l.id
      WHERE l.locataire_id = auth.uid() OR l.gestionnaire_id = auth.uid()
    )
  );