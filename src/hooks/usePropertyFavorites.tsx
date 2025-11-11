import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Property } from './useProperties';

export interface PropertyFavorite {
  id: string;
  user_id: string;
  property_id: string;
  prix_initial: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  property?: Property;
}

export const usePropertyFavorites = () => {
  const [favorites, setFavorites] = useState<PropertyFavorite[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchFavorites = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('property_favorites')
      .select(`
        *,
        property:properties(*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching favorites:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les favoris"
      });
    } else {
      setFavorites(data || []);
      setFavoriteIds(new Set(data?.map(f => f.property_id) || []));
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchFavorites();

    const channel = supabase
      .channel('favorites-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'property_favorites'
        },
        () => {
          fetchFavorites();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchFavorites]);

  const isFavorite = (propertyId: string) => {
    return favoriteIds.has(propertyId);
  };

  const addFavorite = async (property: Property) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Vous devez être connecté"
      });
      return { data: null, error: new Error('Not authenticated') };
    }

    const { data, error } = await supabase
      .from('property_favorites')
      .insert([{
        user_id: user.id,
        property_id: property.id,
        prix_initial: property.prix_mensuel
      }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        toast({
          variant: "destructive",
          title: "Déjà dans les favoris",
          description: "Cette propriété est déjà dans vos favoris"
        });
      } else {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: error.message
        });
      }
      return { data: null, error };
    }

    toast({
      title: "Ajouté aux favoris",
      description: "Vous serez notifié en cas de baisse de prix"
    });

    return { data, error: null };
  };

  const removeFavorite = async (propertyId: string) => {
    const { error } = await supabase
      .from('property_favorites')
      .delete()
      .eq('property_id', propertyId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message
      });
      return { error };
    }

    toast({
      title: "Retiré des favoris"
    });

    return { error: null };
  };

  const toggleFavorite = async (property: Property) => {
    if (isFavorite(property.id)) {
      return removeFavorite(property.id);
    } else {
      return addFavorite(property);
    }
  };

  const updateNotes = async (favoriteId: string, notes: string) => {
    const { error } = await supabase
      .from('property_favorites')
      .update({ notes })
      .eq('id', favoriteId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message
      });
      return { error };
    }

    toast({
      title: "Notes mises à jour"
    });

    return { error: null };
  };

  return {
    favorites,
    favoriteIds,
    loading,
    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    updateNotes,
    refetch: fetchFavorites
  };
};
