import { useState } from 'react';
import { useSearchAlerts } from '@/hooks/useSearchAlerts';
import { CreateSearchAlertDialog } from '@/components/CreateSearchAlertDialog';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/PageHeader';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Bell, Trash2, Calendar, MapPin, Home, DollarSign, Maximize2, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const SearchAlerts = () => {
  const { alerts, loading, toggleAlert, deleteAlert } = useSearchAlerts();
  const [deleteAlertId, setDeleteAlertId] = useState<string | null>(null);

  const getFrequenceBadge = (frequence: string) => {
    const colors = {
      instantane: 'bg-green-500',
      quotidien: 'bg-blue-500',
      hebdomadaire: 'bg-purple-500'
    };
    const labels = {
      instantane: 'Instantané',
      quotidien: 'Quotidien',
      hebdomadaire: 'Hebdomadaire'
    };
    return (
      <Badge className={colors[frequence as keyof typeof colors]}>
        {labels[frequence as keyof typeof labels]}
      </Badge>
    );
  };

  const handleDelete = async () => {
    if (!deleteAlertId) return;
    await deleteAlert(deleteAlertId);
    setDeleteAlertId(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto p-6 max-w-6xl">
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-64" />
                  <Skeleton className="h-4 w-96 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto p-6 max-w-6xl">
        <PageHeader
          title="Mes alertes de recherche"
          description="Gérez vos alertes et soyez notifié des nouvelles propriétés"
          backTo="/properties"
          actions={<CreateSearchAlertDialog />}
        />

        {alerts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Bell className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Aucune alerte configurée</h3>
              <p className="text-muted-foreground mb-6 text-center max-w-md">
                Créez une alerte pour être notifié quand une propriété correspond à vos critères
              </p>
              <CreateSearchAlertDialog />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <Card key={alert.id} className={!alert.actif ? 'opacity-60' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl">{alert.nom_alerte}</CardTitle>
                        {getFrequenceBadge(alert.frequence)}
                        {alert.actif ? (
                          <Badge variant="outline" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      <CardDescription>
                        Créée le {format(new Date(alert.created_at), 'PPP', { locale: fr })}
                        {alert.nombre_notifications > 0 && (
                          <> • {alert.nombre_notifications} notification(s) envoyée(s)</>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={alert.actif}
                        onCheckedChange={(checked) => toggleAlert(alert.id, checked)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteAlertId(alert.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {alert.ville && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Ville:</span>
                        <span>{alert.ville}</span>
                      </div>
                    )}
                    
                    {alert.quartier && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Quartier:</span>
                        <span>{alert.quartier}</span>
                      </div>
                    )}
                    
                    {alert.type_propriete && (
                      <div className="flex items-center gap-2 text-sm">
                        <Home className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Type:</span>
                        <span>{alert.type_propriete}</span>
                      </div>
                    )}
                    
                    {(alert.prix_min || alert.prix_max) && (
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Prix:</span>
                        <span>
                          {alert.prix_min ? `${alert.prix_min.toLocaleString()} FCFA` : '0'} - {' '}
                          {alert.prix_max ? `${alert.prix_max.toLocaleString()} FCFA` : '∞'}
                        </span>
                      </div>
                    )}
                    
                    {(alert.surface_min || alert.surface_max) && (
                      <div className="flex items-center gap-2 text-sm">
                        <Maximize2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Surface:</span>
                        <span>
                          {alert.surface_min || 0} m² - {alert.surface_max || '∞'} m²
                        </span>
                      </div>
                    )}
                    
                    {(alert.nombre_pieces_min || alert.nombre_pieces_max) && (
                      <div className="flex items-center gap-2 text-sm">
                        <Home className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Pièces:</span>
                        <span>
                          {alert.nombre_pieces_min || 0} - {alert.nombre_pieces_max || '∞'}
                        </span>
                      </div>
                    )}
                    
                    {alert.equipements && alert.equipements.length > 0 && (
                      <div className="flex items-start gap-2 text-sm col-span-full">
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <span className="font-medium">Équipements:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {alert.equipements.map(eq => (
                              <Badge key={eq} variant="secondary" className="text-xs">
                                {eq}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {alert.derniere_notification && (
                    <div className="mt-4 pt-4 border-t flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Dernière notification: {format(new Date(alert.derniere_notification), 'PPp', { locale: fr })}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <AlertDialog open={!!deleteAlertId} onOpenChange={() => setDeleteAlertId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer l'alerte</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer cette alerte ? Vous ne recevrez plus de notifications pour cette recherche.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default SearchAlerts;
