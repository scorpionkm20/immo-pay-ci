import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TourAppointment {
  id: string;
  property_id: string;
  locataire_id: string;
  gestionnaire_id: string;
  date_rendez_vous: string;
  duree_minutes: number;
  statut: 'en_attente' | 'confirme' | 'annule' | 'termine';
  type_visite: 'virtuelle' | 'presentiel';
  notes_locataire: string | null;
  notes_gestionnaire: string | null;
  lien_video: string | null;
  created_at: string;
  updated_at: string;
  property_title?: string;
  locataire_name?: string;
  gestionnaire_name?: string;
}

export const useTourAppointments = (userId?: string) => {
  const [appointments, setAppointments] = useState<TourAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAppointments = async () => {
    if (!userId) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tour_appointments')
        .select('*')
        .or(`locataire_id.eq.${userId},gestionnaire_id.eq.${userId}`)
        .order('date_rendez_vous', { ascending: true });

      if (error) throw error;

      // Enrich with property and user names
      const enriched = await Promise.all(
        (data || []).map(async (apt) => {
          const [propertyResult, locataireResult, gestionnaireResult] = await Promise.all([
            supabase.from('properties').select('titre').eq('id', apt.property_id).single(),
            supabase.from('profiles').select('full_name').eq('user_id', apt.locataire_id).single(),
            supabase.from('profiles').select('full_name').eq('user_id', apt.gestionnaire_id).single()
          ]);

          return {
            ...apt,
            property_title: propertyResult.data?.titre || 'Propriété',
            locataire_name: locataireResult.data?.full_name || 'Locataire',
            gestionnaire_name: gestionnaireResult.data?.full_name || 'Gestionnaire'
          };
        })
      );

      setAppointments(enriched as TourAppointment[]);
    } catch (error: any) {
      console.error('Error fetching appointments:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les rendez-vous"
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAppointments();

    if (!userId) return;

    // Setup realtime subscription
    const channel = supabase
      .channel('tour-appointments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tour_appointments',
          filter: `locataire_id=eq.${userId}`
        },
        () => fetchAppointments()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tour_appointments',
          filter: `gestionnaire_id=eq.${userId}`
        },
        () => fetchAppointments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const createAppointment = async (
    propertyId: string,
    gestionnaireId: string,
    dateRendezVous: Date,
    typeVisite: 'virtuelle' | 'presentiel',
    notesLocataire?: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { error } = await supabase
        .from('tour_appointments')
        .insert([{
          property_id: propertyId,
          locataire_id: user.id,
          gestionnaire_id: gestionnaireId,
          date_rendez_vous: dateRendezVous.toISOString(),
          type_visite: typeVisite,
          notes_locataire: notesLocataire
        }]);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Rendez-vous demandé avec succès"
      });

      await fetchAppointments();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de créer le rendez-vous"
      });
      console.error('Error creating appointment:', error);
    }
  };

  const updateAppointmentStatus = async (
    appointmentId: string,
    statut: 'confirme' | 'annule' | 'termine',
    notesGestionnaire?: string
  ) => {
    try {
      const updateData: any = { statut };
      if (notesGestionnaire) {
        updateData.notes_gestionnaire = notesGestionnaire;
      }

      const { error } = await supabase
        .from('tour_appointments')
        .update(updateData)
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Statut du rendez-vous mis à jour"
      });

      await fetchAppointments();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de mettre à jour le rendez-vous"
      });
      console.error('Error updating appointment:', error);
    }
  };

  const deleteAppointment = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('tour_appointments')
        .delete()
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Rendez-vous supprimé"
      });

      await fetchAppointments();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer le rendez-vous"
      });
      console.error('Error deleting appointment:', error);
    }
  };

  return {
    appointments,
    loading,
    createAppointment,
    updateAppointmentStatus,
    deleteAppointment,
    refetch: fetchAppointments
  };
};
