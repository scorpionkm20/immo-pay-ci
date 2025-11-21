import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface RentalRequest {
  id: string;
  property_id: string;
  tenant_id: string;
  manager_id: string;
  space_id: string;
  request_status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  message: string | null;
  proposed_start_date: string | null;
  created_at: string;
  updated_at: string;
}

export const useRentalRequests = (propertyId?: string) => {
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchRequests = async () => {
    setLoading(true);
    let query = supabase
      .from('rental_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (propertyId) {
      query = query.eq('property_id', propertyId);
    }

    const { data, error } = await query;

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les demandes de location"
      });
    } else {
      setRequests((data || []) as RentalRequest[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();

    // Set up realtime subscription
    const channel = supabase
      .channel('rental-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rental_requests'
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [propertyId]);

  const createRequest = async (requestData: {
    property_id: string;
    manager_id: string;
    space_id: string;
    message?: string;
    proposed_start_date?: string;
  }) => {
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
      .from('rental_requests')
      .insert([{
        ...requestData,
        tenant_id: user.id,
        request_status: 'pending'
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
      title: "Demande envoyée",
      description: "Votre demande de location a été envoyée au gestionnaire"
    });

    return { data, error: null };
  };

  const approveRequest = async (
    requestId: string,
    startDate: string,
    monthlyRent: number,
    cautionAmount: number
  ) => {
    const { data, error } = await supabase.rpc('approve_rental_request', {
      p_request_id: requestId,
      p_start_date: startDate,
      p_monthly_rent: monthlyRent,
      p_caution_amount: cautionAmount
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur d'approbation",
        description: error.message
      });
      return { data: null, error };
    }

    toast({
      title: "Demande approuvée",
      description: "Le bail a été créé et la caution facturée"
    });

    return { data, error: null };
  };

  const rejectRequest = async (requestId: string, reason?: string) => {
    const { data, error } = await supabase.rpc('reject_rental_request', {
      p_request_id: requestId,
      p_rejection_reason: reason
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur de rejet",
        description: error.message
      });
      return { data: null, error };
    }

    toast({
      title: "Demande rejetée",
      description: "La demande a été rejetée"
    });

    return { data, error: null };
  };

  const cancelRequest = async (requestId: string) => {
    const { error } = await supabase
      .from('rental_requests')
      .update({ request_status: 'cancelled' })
      .eq('id', requestId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message
      });
      return { error };
    }

    toast({
      title: "Demande annulée",
      description: "Votre demande a été annulée"
    });

    return { error: null };
  };

  return {
    requests,
    loading,
    createRequest,
    approveRequest,
    rejectRequest,
    cancelRequest,
    refetch: fetchRequests
  };
};
