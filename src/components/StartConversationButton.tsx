import { useState, useEffect } from 'react';
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
  const [cautionPaid, setCautionPaid] = useState(false);
  const [checkingCaution, setCheckingCaution] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkCautionStatus();
  }, [propertyId]);

  const checkCautionStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCheckingCaution(false);
        return;
      }

      // Check if user has an active lease with paid caution for this property
      const { data: lease } = await supabase
        .from('leases')
        .select('caution_payee')
        .eq('property_id', propertyId)
        .eq('locataire_id', user.id)
        .eq('statut', 'actif')
        .single();

      setCautionPaid(lease?.caution_payee || false);
    } catch (error) {
      console.error('Error checking caution status:', error);
    } finally {
      setCheckingCaution(false);
    }
  };

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

  if (checkingCaution) {
    return (
      <Button disabled className={className} variant="outline">
        <MessageSquare className="h-4 w-4 mr-2" />
        Vérification...
      </Button>
    );
  }

  if (!cautionPaid) {
    return (
      <Button
        onClick={() => {
          toast({
            title: "Paiement de caution requis",
            description: "Vous devez d'abord payer la caution pour contacter le gestionnaire"
          });
          navigate('/pending-payments');
        }}
        className={className}
        variant="outline"
      >
        <MessageSquare className="h-4 w-4 mr-2" />
        Payer la caution pour contacter
      </Button>
    );
  }

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
