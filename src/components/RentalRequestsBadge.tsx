import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeRentalRequests } from '@/hooks/useRealtimeRentalRequests';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileCheck } from 'lucide-react';

export const RentalRequestsBadge = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [isBlinking, setIsBlinking] = useState(false);

  // Fetch pending requests count
  const fetchPendingCount = async () => {
    if (!user) return;

    const { count, error } = await supabase
      .from('rental_requests')
      .select('*', { count: 'exact', head: true })
      .eq('manager_id', user.id)
      .eq('request_status', 'pending');

    if (!error && count !== null) {
      setPendingCount(count);
    }
  };

  useEffect(() => {
    if (userRole === 'gestionnaire' || userRole === 'admin') {
      fetchPendingCount();
    }
  }, [user, userRole]);

  // Listen to realtime updates
  useRealtimeRentalRequests({
    managerId: user?.id,
    onNewRequest: () => {
      fetchPendingCount();
      // Trigger blinking animation
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 3000); // Stop blinking after 3 seconds
    }
  });

  // Don't show for non-managers or if no pending requests
  if (userRole !== 'gestionnaire' && userRole !== 'admin') {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => navigate('/quick-requests')}
      className={`relative ${isBlinking ? 'animate-pulse-slow' : ''}`}
    >
      <FileCheck className="h-5 w-5" />
      {pendingCount > 0 && (
        <Badge 
          variant="destructive" 
          className={`absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs ${
            isBlinking ? 'animate-blink' : ''
          }`}
        >
          {pendingCount > 9 ? '9+' : pendingCount}
        </Badge>
      )}
      <span className="ml-2 hidden md:inline">Demandes</span>
    </Button>
  );
};
