import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/hooks/useNotifications';
import { PageHeader } from '@/components/PageHeader';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const Notifications = () => {
  const navigate = useNavigate();
  const { notifications, loading, markAsRead, markAllAsRead } = useNotifications();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'rappel_paiement':
        return '📅';
      case 'retard_paiement':
        return '⚠️';
      case 'paiement_recu':
        return '✅';
      default:
        return '📢';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'rappel_paiement':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      case 'retard_paiement':
        return 'bg-red-500/10 text-red-600 dark:text-red-400';
      case 'paiement_recu':
        return 'bg-green-500/10 text-green-600 dark:text-green-400';
      default:
        return 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <PageHeader title="Notifications" backTo="/dashboard" />
          <div className="text-center text-muted-foreground">Chargement...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title="Notifications"
          backTo="/dashboard"
          actions={
            notifications.some(n => !n.lu) && (
              <Button variant="outline" onClick={markAllAsRead}>
                <CheckCheck className="h-4 w-4 mr-2" />
                Tout marquer comme lu
              </Button>
            )
          }
        />

        {notifications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bell className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Aucune notification pour le moment
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <Card 
                key={notification.id}
                className={`cursor-pointer transition-colors ${
                  !notification.lu ? 'bg-accent/50' : ''
                }`}
                onClick={() => !notification.lu && markAsRead(notification.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-lg">{notification.titre}</CardTitle>
                          {!notification.lu && (
                            <Badge variant="secondary" className="text-xs">
                              Nouveau
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {format(new Date(notification.created_at), 'PPp', { locale: fr })}
                        </p>
                        <Badge className={getNotificationColor(notification.type)}>
                          {notification.type === 'rappel_paiement' && 'Rappel'}
                          {notification.type === 'retard_paiement' && 'Retard'}
                          {notification.type === 'paiement_recu' && 'Paiement reçu'}
                        </Badge>
                      </div>
                    </div>
                    {!notification.lu && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground">{notification.message}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
