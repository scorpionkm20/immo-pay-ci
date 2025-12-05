import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Property {
  id: string;
  gestionnaire_id: string;
  proprietaire_id: string | null;
  titre: string;
  description: string;
  adresse: string;
  ville: string;
  quartier: string | null;
  prix_mensuel: number;
  caution: number;
  nombre_pieces: number;
  surface_m2: number | null;
  type_propriete: string;
  statut: 'disponible' | 'loue' | 'en_attente_validation' | 'indisponible';
  images: string[];
  equipements: string[];
  latitude: number | null;
  longitude: number | null;
  date_publication: string;
  validation_proprietaire: boolean;
}

export const useProperties = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchProperties = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('date_publication', { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les annonces"
      });
    } else {
      setProperties(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProperties();

    // Set up realtime subscription
    const channel = supabase
      .channel('properties-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'properties'
        },
        () => {
          fetchProperties();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const createProperty = async (propertyData: any) => {
    // Ensure space_id is included - try multiple sources
    if (!propertyData.space_id) {
      // Try localStorage first
      let spaceId = localStorage.getItem('currentSpaceId');
      
      // If not in localStorage, fetch user's spaces
      if (!spaceId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: spaceMemberships } = await supabase
            .from('space_members')
            .select('space_id')
            .eq('user_id', user.id)
            .eq('role', 'gestionnaire')
            .limit(1)
            .single();
          
          if (spaceMemberships?.space_id) {
            spaceId = spaceMemberships.space_id;
            localStorage.setItem('currentSpaceId', spaceId);
          }
        }
      }
      
      if (!spaceId) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Aucun espace de gestion trouvé. Veuillez créer ou rejoindre un espace."
        });
        return { data: null, error: new Error("No space found") };
      }
      propertyData.space_id = spaceId;
    }

    const { data, error } = await supabase
      .from('properties')
      .insert([propertyData])
      .select()
      .single();

    if (error) {
      console.error('Property creation error:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message
      });
      return { data: null, error };
    }

    toast({
      title: "Annonce créée",
      description: "Votre annonce a été publiée avec succès"
    });

    return { data, error: null };
  };

  const updateProperty = async (id: string, updates: Partial<Property>) => {
    const { error } = await supabase
      .from('properties')
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
      title: "Annonce mise à jour",
      description: "Les modifications ont été enregistrées"
    });

    return { error: null };
  };

  const deleteProperty = async (id: string) => {
    const { error } = await supabase
      .from('properties')
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
      title: "Annonce supprimée",
      description: "L'annonce a été supprimée avec succès"
    });

    return { error: null };
  };

  const uploadPropertyImage = async (file: File, propertyId: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${propertyId}-${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('property-images')
      .upload(filePath, file);

    if (uploadError) {
      toast({
        variant: "destructive",
        title: "Erreur d'upload",
        description: uploadError.message
      });
      return { data: null, error: uploadError };
    }

    const { data: { publicUrl } } = supabase.storage
      .from('property-images')
      .getPublicUrl(filePath);

    return { data: publicUrl, error: null };
  };

  return {
    properties,
    loading,
    createProperty,
    updateProperty,
    deleteProperty,
    uploadPropertyImage,
    refetch: fetchProperties
  };
};
