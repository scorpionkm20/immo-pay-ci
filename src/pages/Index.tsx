import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Wrench } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { user, userRole, loading } = useAuth();
  const { unreadCount } = useNotifications();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    } else if (!loading && user) {
      navigate('/dashboard');
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-3xl font-bold">
                Tableau de bord
              </CardTitle>
              <CardDescription>
                Bienvenue dans votre espace {getRoleDisplay(userRole)}
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              className="relative"
              onClick={() => navigate('/notifications')}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-xl font-semibold mb-2">Connecté en tant que:</h2>
            <p className="text-muted-foreground">{user.email}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Rôle: {getRoleDisplay(userRole)}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button onClick={() => navigate('/properties')} variant="default" className="w-full">
              Voir les annonces
            </Button>
            {userRole === 'gestionnaire' && (
              <>
                <Button onClick={() => navigate('/dashboard')} variant="default" className="w-full">
                  Dashboard
                </Button>
                <Button onClick={() => navigate('/my-properties')} variant="outline" className="w-full">
                  Mes propriétés
                </Button>
                <Button onClick={() => navigate('/payment-history')} variant="outline" className="w-full">
                  Historique des paiements
                </Button>
              </>
            )}
            {(userRole === 'locataire' || userRole === 'gestionnaire') && (
              <>
                <Button onClick={() => navigate('/my-leases')} variant="outline" className="w-full">
                  Mes baux
                </Button>
                <Button onClick={() => navigate('/messages')} variant="outline" className="w-full">
                  Messagerie
                </Button>
                <Button onClick={() => navigate('/documents')} variant="outline" className="w-full">
                  Documents & Contrats
                </Button>
                <Button onClick={() => navigate('/maintenance')} variant="outline" className="w-full">
                  <Wrench className="mr-2 h-4 w-4" />
                  Maintenance
                </Button>
              </>
            )}
            {userRole === 'locataire' && (
              <Button onClick={() => navigate('/payments')} className="w-full">
                Payer mon loyer
              </Button>
            )}
            <Button onClick={() => navigate('/profile')} variant="outline" className="w-full">
              Mon Profil
            </Button>
          </div>

          <div className="rounded-lg bg-muted p-4 mt-6">
            <p className="text-sm text-muted-foreground">
              Le système d'authentification multi-rôles est maintenant opérationnel. 
              Les prochaines fonctionnalités (gestion des annonces, paiements, etc.) 
              seront ajoutées progressivement.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
