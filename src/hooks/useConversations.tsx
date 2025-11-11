import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Conversation {
  id: string;
  property_id: string;
  locataire_id: string;
  gestionnaire_id: string;
  dernier_message: string | null;
  dernier_message_date: string | null;
  created_at: string;
  updated_at: string;
  property_title?: string;
  other_user_name?: string;
  unread_count?: number;
}

export const useConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`locataire_id.eq.${user.id},gestionnaire_id.eq.${user.id}`)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Enrich conversations with additional data
      const enrichedConversations = await Promise.all(
        (data || []).map(async (conv) => {
          // Get property title
          const { data: property } = await supabase
            .from('properties')
            .select('titre')
            .eq('id', conv.property_id)
            .single();

          // Get other user's name
          const otherUserId = conv.locataire_id === user.id 
            ? conv.gestionnaire_id 
            : conv.locataire_id;
          
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', otherUserId)
            .single();

          // Count unread messages
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('lu', false)
            .neq('sender_id', user.id);

          return {
            ...conv,
            property_title: property?.titre || 'Propriété inconnue',
            other_user_name: profile?.full_name || 'Utilisateur',
            unread_count: count || 0
          };
        })
      );

      setConversations(enrichedConversations);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les conversations"
      });
      console.error('Error fetching conversations:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchConversations();

    // Set up realtime subscription
    const channel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const createOrGetConversation = async (propertyId: string, locataireId: string, gestionnaireId: string) => {
    try {
      // Check if conversation already exists
      const { data: existing, error: existingError } = await supabase
        .from('conversations')
        .select('*')
        .eq('property_id', propertyId)
        .eq('locataire_id', locataireId)
        .eq('gestionnaire_id', gestionnaireId)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existing) {
        return { data: existing, error: null };
      }

      // Create new conversation
      const { data, error } = await supabase
        .from('conversations')
        .insert([{
          property_id: propertyId,
          locataire_id: locataireId,
          gestionnaire_id: gestionnaireId
        }])
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message
      });
      return { data: null, error };
    }
  };

  return {
    conversations,
    loading,
    createOrGetConversation,
    refetch: fetchConversations
  };
};
