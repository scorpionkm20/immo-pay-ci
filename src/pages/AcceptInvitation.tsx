import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSpaceInvitations } from '@/hooks/useSpaceInvitations';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle, LogIn } from 'lucide-react';

const AcceptInvitation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { acceptInvitation } = useSpaceInvitations();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'needs_auth'>('loading');
  const [message, setMessage] = useState('');
  const [processed, setProcessed] = useState(false);

  const token = searchParams.get('token');

  const handleAcceptInvitation = useCallback(async () => {
    if (!token) {
      setStatus('error');
      setMessage('Token d\'invitation manquant ou invalide');
      return;
    }

    if (authLoading) {
      return; // Wait for auth to finish loading
    }

    if (!user) {
      setStatus('needs_auth');
      setMessage('Vous devez être connecté pour accepter cette invitation');
      return;
    }

    if (processed) return;
    setProcessed(true);

    const spaceId = await acceptInvitation(token);
    
    if (spaceId) {
      setStatus('success');
      setMessage('Vous avez rejoint l\'espace avec succès !');
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } else {
      setStatus('error');
      setMessage('Impossible d\'accepter l\'invitation. Elle a peut-être expiré, été utilisée, ou n\'est pas destinée à votre adresse email.');
    }
  }, [token, user, authLoading, processed, acceptInvitation, navigate]);

  useEffect(() => {
    handleAcceptInvitation();
  }, [handleAcceptInvitation]);

  const handleLogin = () => {
    // Encode the current URL to redirect back after login
    const redirectUrl = encodeURIComponent(`/accept-invitation?token=${token}`);
    navigate(`/auth?redirect=${redirectUrl}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Invitation à rejoindre un espace</CardTitle>
          <CardDescription>
            {status === 'loading' && 'Traitement de votre invitation...'}
            {status === 'needs_auth' && 'Connexion requise'}
            {status === 'success' && 'Invitation acceptée'}
            {status === 'error' && 'Erreur'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {status === 'loading' && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground text-center">
                Veuillez patienter...
              </p>
            </>
          )}

          {status === 'needs_auth' && (
            <>
              <LogIn className="h-12 w-12 text-primary" />
              <p className="text-center">{message}</p>
              <p className="text-sm text-muted-foreground text-center">
                Connectez-vous ou créez un compte pour rejoindre l'espace.
              </p>
              <Button onClick={handleLogin} className="w-full">
                <LogIn className="h-4 w-4 mr-2" />
                Se connecter / S'inscrire
              </Button>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <p className="text-center font-medium">{message}</p>
              <p className="text-sm text-muted-foreground text-center">
                Redirection vers le tableau de bord...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 text-destructive" />
              <p className="text-center">{message}</p>
              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate('/auth')}
                >
                  Se connecter
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => navigate('/')}
                >
                  Retour à l'accueil
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvitation;
