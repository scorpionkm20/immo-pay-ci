import { Navbar } from '@/components/Navbar';
import { RentalRequestsManager } from '@/components/RentalRequestsManager';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';

const RentalRequests = () => {
  const { userRole } = useAuth();

  if (userRole !== 'gestionnaire' && userRole !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <PageHeader
          title="Demandes de Location"
          description="Gérez les demandes de location de vos propriétés"
          backTo="/home"
        />
        <RentalRequestsManager />
      </main>
    </div>
  );
};

export default RentalRequests;
