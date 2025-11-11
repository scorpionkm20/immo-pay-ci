import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import imageCompression from 'browser-image-compression';

export interface VirtualTour {
  id: string;
  property_id: string;
  titre: string;
  description: string | null;
  type: 'video' | 'photo_360';
  media_url: string;
  thumbnail_url: string | null;
  order_index: number;
  created_at: string;
  created_by: string;
  updated_at: string;
}

export const useVirtualTours = (propertyId?: string) => {
  const [tours, setTours] = useState<VirtualTour[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTours = async () => {
    if (!propertyId) {
      setTours([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('virtual_tours')
        .select('*')
        .eq('property_id', propertyId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      setTours((data || []) as VirtualTour[]);
    } catch (error: any) {
      console.error('Error fetching virtual tours:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les visites virtuelles"
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTours();
  }, [propertyId]);

  const uploadTour = async (
    propertyId: string,
    file: File,
    titre: string,
    description: string,
    type: 'video' | 'photo_360'
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      // Compress image if it's a photo
      let fileToUpload = file;
      if (type === 'photo_360' && file.type.startsWith('image/')) {
        fileToUpload = await imageCompression(file, {
          maxSizeMB: 5,
          maxWidthOrHeight: 4096,
          useWebWorker: true
        });
      }

      // Upload media file
      const fileExt = fileToUpload.name.split('.').pop();
      const filePath = `${propertyId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('virtual-tours')
        .upload(filePath, fileToUpload);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('virtual-tours')
        .getPublicUrl(filePath);

      // Get current max order_index
      const { data: existingTours } = await supabase
        .from('virtual_tours')
        .select('order_index')
        .eq('property_id', propertyId)
        .order('order_index', { ascending: false })
        .limit(1);

      const nextOrderIndex = existingTours && existingTours.length > 0 
        ? existingTours[0].order_index + 1 
        : 0;

      // Create virtual tour record
      const { error: dbError } = await supabase
        .from('virtual_tours')
        .insert([{
          property_id: propertyId,
          titre,
          description,
          type,
          media_url: publicUrl,
          order_index: nextOrderIndex,
          created_by: user.id
        }]);

      if (dbError) throw dbError;

      toast({
        title: "Succès",
        description: "Visite virtuelle ajoutée avec succès"
      });

      await fetchTours();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible d'ajouter la visite virtuelle"
      });
      console.error('Error uploading virtual tour:', error);
    }
  };

  const deleteTour = async (tourId: string, mediaPath: string) => {
    try {
      // Delete from database
      const { error: dbError } = await supabase
        .from('virtual_tours')
        .delete()
        .eq('id', tourId);

      if (dbError) throw dbError;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('virtual-tours')
        .remove([mediaPath]);

      if (storageError) console.error('Storage delete error:', storageError);

      toast({
        title: "Succès",
        description: "Visite virtuelle supprimée"
      });

      await fetchTours();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer la visite virtuelle"
      });
      console.error('Error deleting virtual tour:', error);
    }
  };

  const reorderTours = async (tourIds: string[]) => {
    try {
      const updates = tourIds.map((id, index) => 
        supabase
          .from('virtual_tours')
          .update({ order_index: index })
          .eq('id', id)
      );

      await Promise.all(updates);
      await fetchTours();
    } catch (error: any) {
      console.error('Error reordering tours:', error);
    }
  };

  return {
    tours,
    loading,
    uploadTour,
    deleteTour,
    reorderTours,
    refetch: fetchTours
  };
};
