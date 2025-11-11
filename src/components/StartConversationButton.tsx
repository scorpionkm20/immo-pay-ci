import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useConversations } from '@/hooks/useConversations';
import { MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StartConversationButtonProps {
  propertyId: string;
  gestionnaireId: string;
  className?: string;
}

export const StartConversationButton = ({ 
  propertyId, 
  gestionnaireId,
  className 
}: StartConversationButtonProps) => {
  const navigate = useNavigate();
  const { createOrGetConversation } = useConversations();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleStartConversation = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Vous devez être connecté"
        });
        return;
      }

      const { data, error } = await createOrGetConversation(
        propertyId,
        user.id,
        gestionnaireId
      );

      if (error || !data) {
        throw new Error('Impossible de créer la conversation');
      }

      navigate(`/messages?conversation=${data.id}`);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleStartConversation}
      disabled={loading}
      className={className}
      variant="outline"
    >
      <MessageSquare className="h-4 w-4 mr-2" />
      {loading ? 'Chargement...' : 'Contacter le gestionnaire'}
    </Button>
  );
};
