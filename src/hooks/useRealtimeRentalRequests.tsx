import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RentalRequest } from '@/hooks/useRentalRequests';

interface UseRealtimeRentalRequestsProps {
  onNewRequest?: (request: RentalRequest) => void;
  managerId?: string;
}

export const useRealtimeRentalRequests = ({ 
  onNewRequest, 
  managerId 
}: UseRealtimeRentalRequestsProps) => {
  const { toast } = useToast();

  useEffect(() => {
    if (!managerId) return;

    const channel = supabase
      .channel('rental-requests-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rental_requests'
        },
        async (payload) => {
          const newRequest = payload.new as RentalRequest;
          
          // Vérifier que la demande est pour ce gestionnaire
          if (newRequest.manager_id === managerId) {
            // Charger les infos de la propriété et du locataire
            const [propertyData, tenantData] = await Promise.all([
              supabase
                .from('properties')
                .select('titre')
                .eq('id', newRequest.property_id)
                .single(),
              supabase
                .from('profiles')
                .select('full_name')
                .eq('user_id', newRequest.tenant_id)
                .single()
            ]);

            const propertyTitle = propertyData.data?.titre || 'Propriété';
            const tenantName = tenantData.data?.full_name || 'Un locataire';

            // Jouer un son de notification
            try {
              const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUBAMU6rm8LtyKAU1j9X1ynwwBSd+zPHbkD4KEluv6OyoWBMKTKXh8bllHAY6ktPz0YI0Bh9wwPDgmE4QDVOo5u+7dCoFNo/W9cp+MAUpftDx3JBACBNfsOjrp1gUCkyj4fK8ayEFM4fR89GCNQYfccLw35lPEA1TqOXwvHYtBTaQ1/PIfjEGKIDN8N2SQQgSXK/o7KlYFApNo+Hyu2sjBTSI0/TTgjUGH3HC8OCYThANU6jl8Lx3LgU3kdb1y38xBSqAzvDckkEJE12v6O2oVxQKTKPh8Lx2KwUzidT003I0BiB0w+/hmE4PDFOp5PC7dywFOJHY9Ml8MQUrgM/v3JFBCRJcr+rsplYUD0yk4fG7eCoFN4jU9NKBNAYgdcPw4JhOEAxVqubxvHgsBTqS2PTJfDEGLIHP79yRQQgRXa/o7KdWEg9MpOHxu3gsVU6kdb1ygDQGInXD8OCYThAMVqnnpk4NEAxVqufxvHgtBTuT2vLHfzIFLIHQ8NySQQgRXq/o7ahWEhBOpeHyu3grBTeJ1fTVgjMHI3bD8OCZUQ0MVqvm8L15LwU8lNrywX4xBi2C0e/dkkEJE16w6OypVxIPT6Xi8rp5KwU5ity01IIzByJ1w/DhmVAOC1ap5vC9eC0FPZXb8sF+MwYtg9Hw3pJBCRNfsOjuqVcTD06l4vK6eiwFOorb9NSDMwgidc');
              audio.play().catch(() => {
                // Silently fail if audio can't play
              });
            } catch (e) {
              // Ignore audio errors
            }

            // Afficher le toast
            toast({
              title: '🔔 Nouvelle demande de location !',
              description: `${tenantName} souhaite louer "${propertyTitle}"`,
              duration: 8000,
            });

            // Callback
            if (onNewRequest) {
              onNewRequest(newRequest);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [managerId, onNewRequest, toast]);
};
