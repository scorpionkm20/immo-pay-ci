import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  lu: boolean;
  created_at: string;
  sender_name?: string;
  file_url?: string;
  file_type?: string;
  file_name?: string;
}

export const useMessages = (conversationId: string | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const enrichedMessages = await Promise.all(
        (data || []).map(async (msg) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', msg.sender_id)
            .single();

          return {
            ...msg,
            sender_name: profile?.full_name || 'Utilisateur'
          };
        })
      );

      setMessages(enrichedMessages);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
    }
    setLoading(false);
  }, [conversationId]);

  useEffect(() => {
    fetchMessages();

    if (!conversationId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          const newMessage = payload.new as Message;
          
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', newMessage.sender_id)
            .single();

          setMessages(prev => [...prev, {
            ...newMessage,
            sender_name: profile?.full_name || 'Utilisateur'
          }]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMessages, conversationId]);

  const sendMessage = async (
    content: string, 
    fileUrl?: string, 
    fileType?: string, 
    fileName?: string
  ) => {
    if (!conversationId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('messages')
        .insert([{
          conversation_id: conversationId,
          sender_id: user.id,
          content,
          file_url: fileUrl,
          file_type: fileType,
          file_name: fileName
        }]);

      if (error) throw error;
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'envoyer le message"
      });
      console.error('Error sending message:', error);
    }
  };

  const markAsRead = async () => {
    if (!conversationId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('messages')
        .update({ lu: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .eq('lu', false);
    } catch (error: any) {
      console.error('Error marking messages as read:', error);
    }
  };

  return {
    messages,
    loading,
    sendMessage,
    markAsRead,
    refetch: fetchMessages
  };
};
