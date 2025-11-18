import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SavedDesign {
  id: string;
  user_id: string;
  design_name: string;
  style_name: string;
  style_description: string | null;
  original_image_url: string;
  designed_image_url: string;
  created_at: string;
  updated_at: string;
}

export const useSavedDesigns = () => {
  const [designs, setDesigns] = useState<SavedDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchDesigns = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setDesigns([]);
        return;
      }

      const { data, error } = await supabase
        .from('saved_bedroom_designs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDesigns(data || []);
    } catch (error: any) {
      console.error('Error fetching saved designs:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger vos designs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDesigns();
  }, [fetchDesigns]);

  const saveDesign = async (
    designName: string,
    styleName: string,
    styleDescription: string | null,
    originalImageUrl: string,
    designedImageUrl: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      // Upload images to storage if they're base64
      let finalOriginalUrl = originalImageUrl;
      let finalDesignedUrl = designedImageUrl;

      if (originalImageUrl.startsWith('data:')) {
        const originalBlob = await fetch(originalImageUrl).then(r => r.blob());
        const originalFileName = `original-${Date.now()}.png`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('message-attachments')
          .upload(`${user.id}/designs/${originalFileName}`, originalBlob, {
            contentType: 'image/png',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('message-attachments')
          .getPublicUrl(uploadData.path);
        
        finalOriginalUrl = publicUrl;
      }

      if (designedImageUrl.startsWith('data:')) {
        const designedBlob = await fetch(designedImageUrl).then(r => r.blob());
        const designedFileName = `designed-${Date.now()}.png`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('message-attachments')
          .upload(`${user.id}/designs/${designedFileName}`, designedBlob, {
            contentType: 'image/png',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('message-attachments')
          .getPublicUrl(uploadData.path);
        
        finalDesignedUrl = publicUrl;
      }

      const { error } = await supabase
        .from('saved_bedroom_designs')
        .insert([{
          user_id: user.id,
          design_name: designName,
          style_name: styleName,
          style_description: styleDescription,
          original_image_url: finalOriginalUrl,
          designed_image_url: finalDesignedUrl
        }]);

      if (error) throw error;

      toast({
        title: 'Succès!',
        description: 'Design sauvegardé avec succès',
      });

      await fetchDesigns();
    } catch (error: any) {
      console.error('Error saving design:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder le design',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deleteDesign = async (designId: string) => {
    try {
      const { error } = await supabase
        .from('saved_bedroom_designs')
        .delete()
        .eq('id', designId);

      if (error) throw error;

      toast({
        title: 'Succès!',
        description: 'Design supprimé',
      });

      await fetchDesigns();
    } catch (error: any) {
      console.error('Error deleting design:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le design',
        variant: 'destructive',
      });
    }
  };

  const updateDesignName = async (designId: string, newName: string) => {
    try {
      const { error } = await supabase
        .from('saved_bedroom_designs')
        .update({ design_name: newName })
        .eq('id', designId);

      if (error) throw error;

      toast({
        title: 'Succès!',
        description: 'Nom du design mis à jour',
      });

      await fetchDesigns();
    } catch (error: any) {
      console.error('Error updating design name:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le nom',
        variant: 'destructive',
      });
    }
  };

  return {
    designs,
    loading,
    saveDesign,
    deleteDesign,
    updateDesignName,
    refetch: fetchDesigns
  };
};
