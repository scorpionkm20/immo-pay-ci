import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Navbar } from '@/components/Navbar';
import { Building2, Users, FileText, DollarSign, Wrench, Bell, TrendingUp, Home } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, userRole, loading } = useAuth();
  const { unreadCount } = useNotifications();
  const { stats, isLoading: statsLoading } = useDashboardStats();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!user) return null;

  const getRoleDisplay = (role: string | null) => {
    switch (role) {
      case 'gestionnaire':
        return 'Gestionnaire';
      case 'proprietaire':
        return 'Propriétaire';
      case 'locataire':
      default:
        return 'Locataire';
    }
  };

  const getGestionnaireStats = () => [
    {
      title: 'Propriétés',
      value: stats?.totalProperties || 0,
      icon: Building2,
      description: 'Propriétés gérées',
      color: 'text-primary',
      bgColor: 'bg-primary-light',
    },
    {
      title: 'Baux Actifs',
      value: stats?.activeLeases || 0,
      icon: Users,
      description: 'Contrats en cours',
      color: 'text-secondary',
      bgColor: 'bg-secondary-light',
    },
    {
      title: 'Tickets Ouverts',
      value: stats?.openTickets || 0,
      icon: Wrench,
      description: 'Demandes de maintenance',
      color: 'text-destructive',
      bgColor: 'bg-red-100',
    },
    {
      title: 'Revenus du Mois',
      value: `${stats?.monthlyRevenue?.toLocaleString() || 0} FCFA`,
      icon: TrendingUp,
      description: 'Paiements reçus',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
  ];

  const getLocataireStats = () => [
    {
      title: 'Baux Actifs',
      value: stats?.activeLeases || 0,
      icon: Home,
      description: 'Logements loués',
      color: 'text-primary',
      bgColor: 'bg-primary-light',
    },
    {
      title: 'Paiements en Attente',
      value: stats?.pendingPayments || 0,
      icon: DollarSign,
      description: 'À payer',
      color: 'text-secondary',
      bgColor: 'bg-secondary-light',
    },
    {
      title: 'Tickets Ouverts',
      value: stats?.openTickets || 0,
      icon: Wrench,
      description: 'Demandes en cours',
      color: 'text-destructive',
      bgColor: 'bg-red-100',
    },
    {
      title: 'Documents',
      value: stats?.unsignedDocuments || 0,
      icon: FileText,
      description: 'À signer',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
  ];

  const statsCards = userRole === 'gestionnaire' ? getGestionnaireStats() : getLocataireStats();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <div className="container py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Tableau de bord {getRoleDisplay(userRole)}
          </h1>
          <p className="text-muted-foreground">
            Bienvenue, {user.email}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))
          ) : (
            statsCards.map((stat, index) => (
              <Card key={index} className="transition-shadow hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Actions rapides */}
        <Card>
          <CardHeader>
            <CardTitle>Actions Rapides</CardTitle>
            <CardDescription>Accédez rapidement à vos fonctionnalités principales</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Button onClick={() => navigate('/properties')} variant="outline" className="w-full h-auto py-6 flex flex-col gap-2">
                <Building2 className="h-6 w-6" />
                <span>Voir les Annonces</span>
              </Button>
              
              {userRole === 'gestionnaire' && (
                <>
                  <Button onClick={() => navigate('/my-properties')} variant="outline" className="w-full h-auto py-6 flex flex-col gap-2">
                    <Home className="h-6 w-6" />
                    <span>Mes Propriétés</span>
                  </Button>
                  <Button onClick={() => navigate('/payment-history')} variant="outline" className="w-full h-auto py-6 flex flex-col gap-2">
                    <DollarSign className="h-6 w-6" />
                    <span>Historique Paiements</span>
                  </Button>
                </>
              )}
              
              {(userRole === 'locataire' || userRole === 'gestionnaire') && (
                <>
                  <Button onClick={() => navigate('/my-leases')} variant="outline" className="w-full h-auto py-6 flex flex-col gap-2">
                    <FileText className="h-6 w-6" />
                    <span>Mes Baux</span>
                  </Button>
                  <Button onClick={() => navigate('/messages')} variant="outline" className="w-full h-auto py-6 flex flex-col gap-2">
                    <Users className="h-6 w-6" />
                    <span>Messagerie</span>
                  </Button>
                  <Button onClick={() => navigate('/documents')} variant="outline" className="w-full h-auto py-6 flex flex-col gap-2">
                    <FileText className="h-6 w-6" />
                    <span>Documents</span>
                  </Button>
                  <Button onClick={() => navigate('/maintenance')} variant="outline" className="w-full h-auto py-6 flex flex-col gap-2">
                    <Wrench className="h-6 w-6" />
                    <span>Maintenance</span>
                  </Button>
                </>
              )}
              
              {userRole === 'locataire' && (
                <Button onClick={() => navigate('/payments')} className="w-full h-auto py-6 flex flex-col gap-2">
                  <DollarSign className="h-6 w-6" />
                  <span>Payer mon Loyer</span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
