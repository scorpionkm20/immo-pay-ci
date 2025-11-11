import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSpaceInvitations } from '@/hooks/useSpaceInvitations';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

const AcceptInvitation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { acceptInvitation } = useSpaceInvitations();
  const { user } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    const handleAcceptInvitation = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Token d\'invitation manquant');
        return;
      }

      if (!user) {
        // Rediriger vers l'authentification avec le token dans l'URL
        navigate(`/auth?redirect=/accept-invitation?token=${token}`);
        return;
      }

      const spaceId = await acceptInvitation(token);
      
      if (spaceId) {
        setStatus('success');
        setMessage('Vous avez rejoint l\'espace avec succès !');
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        setStatus('error');
        setMessage('Impossible d\'accepter l\'invitation. Elle a peut-être expiré ou été utilisée.');
      }
    };

    handleAcceptInvitation();
  }, [token, user]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Invitation à rejoindre un espace</CardTitle>
          <CardDescription>
            {status === 'loading' && 'Traitement de votre invitation...'}
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

          {status === 'success' && (
            <>
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <p className="text-center">{message}</p>
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
