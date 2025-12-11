import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect } from "react";

export type TicketStatus = "ouvert" | "en_cours" | "resolu" | "ferme";
export type TicketPriority = "faible" | "moyenne" | "haute" | "urgente";

export interface PropertyInfo {
  id: string;
  titre: string;
  adresse: string;
  ville: string;
  quartier: string | null;
  type_propriete: string;
  images: string[] | null;
}

export interface MaintenanceTicket {
  id: string;
  lease_id: string;
  created_by: string;
  titre: string;
  description: string;
  statut: TicketStatus;
  priorite: TicketPriority;
  photos: string[];
  created_at: string;
  updated_at: string;
  space_id: string;
  property?: PropertyInfo;
}

export interface MaintenanceIntervention {
  id: string;
  ticket_id: string;
  intervenant_id: string;
  description: string;
  statut_avant: TicketStatus | null;
  statut_apres: TicketStatus | null;
  created_at: string;
}

const getStatusLabel = (status: TicketStatus): string => {
  switch (status) {
    case "ouvert": return "Ouvert";
    case "en_cours": return "En cours";
    case "resolu": return "Résolu";
    case "ferme": return "Fermé";
    default: return status;
  }
};

export const useMaintenanceTickets = (leaseId?: string) => {
  const queryClient = useQueryClient();

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["maintenance-tickets", leaseId],
    queryFn: async () => {
      let query = supabase
        .from("maintenance_tickets")
        .select(`
          *,
          leases!inner (
            property_id,
            properties (
              id,
              titre,
              adresse,
              ville,
              quartier,
              type_propriete,
              images
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (leaseId && leaseId !== "all") {
        query = query.eq("lease_id", leaseId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Transform data to include property at top level
      return (data || []).map((ticket: any) => ({
        ...ticket,
        property: ticket.leases?.properties || null,
        leases: undefined,
      })) as MaintenanceTicket[];
    },
  });

  // Real-time subscription for ticket updates
  useEffect(() => {
    const channel = supabase
      .channel('maintenance-tickets-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'maintenance_tickets'
        },
        (payload) => {
          const oldTicket = payload.old as MaintenanceTicket;
          const newTicket = payload.new as MaintenanceTicket;
          
          // Show toast notification for status changes
          if (oldTicket.statut !== newTicket.statut) {
            toast.info(`Ticket "${newTicket.titre}"`, {
              description: `Statut mis à jour: ${getStatusLabel(oldTicket.statut)} → ${getStatusLabel(newTicket.statut)}`,
            });
          }
          
          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ["maintenance-tickets"] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'maintenance_tickets'
        },
        (payload) => {
          const newTicket = payload.new as MaintenanceTicket;
          toast.success(`Nouveau ticket créé`, {
            description: newTicket.titre,
          });
          queryClient.invalidateQueries({ queryKey: ["maintenance-tickets"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const createTicket = useMutation({
    mutationFn: async ({
      leaseId,
      titre,
      description,
      priorite,
      photos,
    }: {
      leaseId: string;
      titre: string;
      description: string;
      priorite: TicketPriority;
      photos: File[];
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      // Get space_id from the lease
      const { data: lease } = await supabase
        .from('leases')
        .select('space_id')
        .eq('id', leaseId)
        .single();

      // Create ticket first
      const { data: ticket, error: ticketError } = await supabase
        .from("maintenance_tickets")
        .insert({
          lease_id: leaseId,
          space_id: lease?.space_id,
          created_by: user.id,
          titre,
          description,
          priorite,
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Upload photos if any
      const photoUrls: string[] = [];
      if (photos.length > 0) {
        for (const photo of photos) {
          const fileName = `${ticket.id}/${Date.now()}_${photo.name}`;
          const { error: uploadError } = await supabase.storage
            .from("maintenance-photos")
            .upload(fileName, photo);

          if (uploadError) throw uploadError;

          const {
            data: { publicUrl },
          } = supabase.storage.from("maintenance-photos").getPublicUrl(fileName);

          photoUrls.push(publicUrl);
        }

        // Update ticket with photo URLs
        const { error: updateError } = await supabase
          .from("maintenance_tickets")
          .update({ photos: photoUrls })
          .eq("id", ticket.id);

        if (updateError) throw updateError;
      }

      return ticket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-tickets"] });
      toast.success("Ticket créé avec succès");
    },
    onError: (error) => {
      toast.error("Erreur lors de la création du ticket");
      console.error(error);
    },
  });

  const updateTicketStatus = useMutation({
    mutationFn: async ({
      ticketId,
      statut,
      interventionDescription,
    }: {
      ticketId: string;
      statut: TicketStatus;
      interventionDescription?: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      // Get current ticket
      const { data: ticket } = await supabase
        .from("maintenance_tickets")
        .select("statut")
        .eq("id", ticketId)
        .single();

      // Update ticket status
      const { error: updateError } = await supabase
        .from("maintenance_tickets")
        .update({ statut })
        .eq("id", ticketId);

      if (updateError) throw updateError;

      // Create intervention record if description provided
      if (interventionDescription) {
        const { error: interventionError } = await supabase
          .from("maintenance_interventions")
          .insert({
            ticket_id: ticketId,
            intervenant_id: user.id,
            description: interventionDescription,
            statut_avant: ticket?.statut || null,
            statut_apres: statut,
          });

        if (interventionError) throw interventionError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["maintenance-interventions"] });
      toast.success("Statut mis à jour");
    },
    onError: (error) => {
      toast.error("Erreur lors de la mise à jour");
      console.error(error);
    },
  });

  return {
    tickets,
    isLoading,
    createTicket,
    updateTicketStatus,
  };
};

export const useMaintenanceInterventions = (ticketId: string) => {
  const { data: interventions, isLoading } = useQuery({
    queryKey: ["maintenance-interventions", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_interventions")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as MaintenanceIntervention[];
    },
  });

  return { interventions, isLoading };
};
