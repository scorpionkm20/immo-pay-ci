import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface NotificationPreferences {
  id: string;
  user_id: string;
  nouveau_message: boolean;
  paiement_recu: boolean;
  rappel_paiement: boolean;
  retard_paiement: boolean;
  nouveau_ticket: boolean;
  mise_a_jour_ticket: boolean;
  document_a_signer: boolean;
}

export const useNotificationPreferences = () => {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPreferences = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching preferences:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les préférences"
      });
    } else if (!data) {
      // Create default preferences
      const { data: newPrefs, error: insertError } = await supabase
        .from('notification_preferences')
        .insert({ user_id: user.id })
        .select()
        .single();
      
      if (insertError) {
        console.error('Error creating preferences:', insertError);
      } else {
        setPreferences(newPrefs);
      }
    } else {
      setPreferences(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPreferences();
  }, []);

  const updatePreferences = async (updates: Partial<NotificationPreferences>) => {
    if (!preferences) return;

    const { error } = await supabase
      .from('notification_preferences')
      .update(updates)
      .eq('id', preferences.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message
      });
    } else {
      setPreferences({ ...preferences, ...updates });
      toast({
        title: "Préférences mises à jour"
      });
    }
  };

  return {
    preferences,
    loading,
    updatePreferences,
    refetch: fetchPreferences
  };
};
