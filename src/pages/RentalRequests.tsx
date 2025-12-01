import { Navbar } from '@/components/Navbar';
import { RentalRequestsManager } from '@/components/RentalRequestsManager';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const RentalRequests = () => {
  const navigate = useNavigate();
  const { userRole } = useAuth();

  if (userRole !== 'gestionnaire' && userRole !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate('/home')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </div>
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Demandes de Location</h1>
          <p className="text-muted-foreground">
            Gérez les demandes de location de vos propriétés
          </p>
        </div>
        <RentalRequestsManager />
      </main>
    </div>
  );
};

export default RentalRequests;
