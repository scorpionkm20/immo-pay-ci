import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Index = () => {
  const navigate = useNavigate();
  const { user, userRole, loading } = useAuth();

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">
            Tableau de bord
          </CardTitle>
          <CardDescription>
            Bienvenue dans votre espace {getRoleDisplay(userRole)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-xl font-semibold mb-2">Connecté en tant que:</h2>
            <p className="text-muted-foreground">{user.email}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Rôle: {getRoleDisplay(userRole)}
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => navigate('/properties')} variant="default">
              Voir les annonces
            </Button>
            {userRole === 'gestionnaire' && (
              <>
                <Button onClick={() => navigate('/my-properties')} variant="outline">
                  Mes propriétés
                </Button>
                <Button onClick={() => navigate('/payment-history')} variant="outline">
                  Historique des paiements
                </Button>
              </>
            )}
            {(userRole === 'locataire' || userRole === 'gestionnaire') && (
              <Button onClick={() => navigate('/my-leases')} variant="outline">
                Mes baux
              </Button>
            )}
            {userRole === 'locataire' && (
              <Button onClick={() => navigate('/payments')}>
                Payer mon loyer
              </Button>
            )}
            <Button onClick={() => navigate('/profile')} variant="outline">
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
