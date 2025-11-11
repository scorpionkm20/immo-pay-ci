import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ManagementSpace {
  id: string;
  nom: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SpaceMember {
  id: string;
  space_id: string;
  user_id: string;
  role: 'gestionnaire' | 'proprietaire' | 'locataire';
  created_at: string;
}

export const useManagementSpaces = () => {
  const [spaces, setSpaces] = useState<ManagementSpace[]>([]);
  const [currentSpace, setCurrentSpace] = useState<ManagementSpace | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSpaces = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('management_spaces')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les espaces de gestion"
      });
    } else {
      setSpaces(data || []);
      // Set current space to first one if not set
      if (!currentSpace && data && data.length > 0) {
        const savedSpaceId = localStorage.getItem('currentSpaceId');
        const space = savedSpaceId 
          ? data.find(s => s.id === savedSpaceId) || data[0]
          : data[0];
        setCurrentSpace(space);
        localStorage.setItem('currentSpaceId', space.id);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSpaces();

    // Set up realtime subscription
    const channel = supabase
      .channel('management-spaces-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'management_spaces'
        },
        () => {
          fetchSpaces();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const createSpace = async (spaceData: { nom: string; description?: string }) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Vous devez être connecté"
      });
      return { data: null, error: new Error("Not authenticated") };
    }

    const { data, error } = await supabase
      .from('management_spaces')
      .insert([{
        ...spaceData,
        created_by: user.id
      }])
      .select()
      .single();

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message
      });
      return { data: null, error };
    }

    toast({
      title: "Espace créé",
      description: "Votre espace de gestion a été créé avec succès"
    });

    // Set as current space
    setCurrentSpace(data);
    localStorage.setItem('currentSpaceId', data.id);

    return { data, error: null };
  };

  const updateSpace = async (id: string, updates: Partial<ManagementSpace>) => {
    const { error } = await supabase
      .from('management_spaces')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message
      });
      return { error };
    }

    toast({
      title: "Espace mis à jour",
      description: "Les modifications ont été enregistrées"
    });

    return { error: null };
  };

  const deleteSpace = async (id: string) => {
    const { error } = await supabase
      .from('management_spaces')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message
      });
      return { error };
    }

    toast({
      title: "Espace supprimé",
      description: "L'espace de gestion a été supprimé avec succès"
    });

    // Clear current space if it was deleted
    if (currentSpace?.id === id) {
      setCurrentSpace(null);
      localStorage.removeItem('currentSpaceId');
    }

    return { error: null };
  };

  const switchSpace = (space: ManagementSpace) => {
    setCurrentSpace(space);
    localStorage.setItem('currentSpaceId', space.id);
    toast({
      title: "Espace changé",
      description: `Vous travaillez maintenant dans "${space.nom}"`
    });
  };

  const fetchSpaceMembers = async (spaceId: string) => {
    const { data, error } = await supabase
      .from('space_members')
      .select(`
        *,
        profiles:user_id (full_name, avatar_url)
      `)
      .eq('space_id', spaceId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les membres"
      });
      return { data: null, error };
    }

    return { data, error: null };
  };

  const addMember = async (spaceId: string, userId: string, role: 'gestionnaire' | 'proprietaire' | 'locataire') => {
    const { error } = await supabase
      .from('space_members')
      .insert([{
        space_id: spaceId,
        user_id: userId,
        role
      }]);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message
      });
      return { error };
    }

    toast({
      title: "Membre ajouté",
      description: "Le membre a été ajouté à l'espace avec succès"
    });

    return { error: null };
  };

  const removeMember = async (memberId: string) => {
    const { error } = await supabase
      .from('space_members')
      .delete()
      .eq('id', memberId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message
      });
      return { error };
    }

    toast({
      title: "Membre retiré",
      description: "Le membre a été retiré de l'espace avec succès"
    });

    return { error: null };
  };

  return {
    spaces,
    currentSpace,
    loading,
    createSpace,
    updateSpace,
    deleteSpace,
    switchSpace,
    fetchSpaceMembers,
    addMember,
    removeMember,
    refetch: fetchSpaces
  };
};
