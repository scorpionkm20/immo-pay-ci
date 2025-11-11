import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SpaceInvitation {
  id: string;
  space_id: string;
  invited_by: string;
  email: string;
  role: 'gestionnaire' | 'proprietaire' | 'locataire';
  token: string;
  expires_at: string;
  accepted: boolean;
  accepted_by?: string;
  accepted_at?: string;
  created_at: string;
}

export const useSpaceInvitations = (spaceId?: string) => {
  const [invitations, setInvitations] = useState<SpaceInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvitations = async () => {
    if (!spaceId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('space_invitations')
        .select('*')
        .eq('space_id', spaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
    } catch (error: any) {
      console.error('Erreur lors du chargement des invitations:', error);
      toast.error('Impossible de charger les invitations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, [spaceId]);

  const createInvitation = async (
    email: string,
    role: 'gestionnaire' | 'proprietaire' | 'locataire'
  ): Promise<string | null> => {
    if (!spaceId) return null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      // Générer un token unique
      const token = crypto.randomUUID();
      
      // Expiration dans 7 jours
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { data, error } = await supabase
        .from('space_invitations')
        .insert({
          space_id: spaceId,
          invited_by: user.id,
          email,
          role,
          token,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Invitation créée avec succès');
      await fetchInvitations();
      
      return token;
    } catch (error: any) {
      console.error('Erreur lors de la création de l\'invitation:', error);
      toast.error('Impossible de créer l\'invitation');
      return null;
    }
  };

  const deleteInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('space_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;

      toast.success('Invitation supprimée');
      await fetchInvitations();
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Impossible de supprimer l\'invitation');
    }
  };

  const acceptInvitation = async (token: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      // Récupérer l'invitation
      const { data: invitation, error: fetchError } = await supabase
        .from('space_invitations')
        .select('*')
        .eq('token', token)
        .single();

      if (fetchError) throw fetchError;
      if (!invitation) throw new Error('Invitation non trouvée');

      // Vérifier que l'email correspond
      if (invitation.email !== user.email) {
        throw new Error('Cette invitation n\'est pas pour votre email');
      }

      // Vérifier expiration
      if (new Date(invitation.expires_at) < new Date()) {
        throw new Error('Cette invitation a expiré');
      }

      // Vérifier si déjà acceptée
      if (invitation.accepted) {
        throw new Error('Cette invitation a déjà été acceptée');
      }

      // Ajouter le membre à l'espace
      const { error: memberError } = await supabase
        .from('space_members')
        .insert({
          space_id: invitation.space_id,
          user_id: user.id,
          role: invitation.role,
        });

      if (memberError) throw memberError;

      // Marquer l'invitation comme acceptée
      const { error: updateError } = await supabase
        .from('space_invitations')
        .update({
          accepted: true,
          accepted_by: user.id,
          accepted_at: new Date().toISOString(),
        })
        .eq('id', invitation.id);

      if (updateError) throw updateError;

      toast.success('Vous avez rejoint l\'espace avec succès !');
      return invitation.space_id;
    } catch (error: any) {
      console.error('Erreur lors de l\'acceptation:', error);
      toast.error(error.message || 'Impossible d\'accepter l\'invitation');
      return null;
    }
  };

  return {
    invitations,
    loading,
    createInvitation,
    deleteInvitation,
    acceptInvitation,
    refreshInvitations: fetchInvitations,
  };
};
