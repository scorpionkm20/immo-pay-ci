import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, MessageSquare, CreditCard, Wrench, FileText } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { PageHeader } from "@/components/PageHeader";

const NotificationSettings = () => {
  const { preferences, loading, updatePreferences } = useNotificationPreferences();

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto p-6 max-w-3xl">
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96 mt-2" />
            </CardHeader>
            <CardContent className="space-y-6">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-6 w-12" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!preferences) return null;

  const notificationTypes = [
    {
      key: 'nouveau_message' as const,
      icon: MessageSquare,
      label: 'Nouveaux messages',
      description: 'Recevoir une notification lors de nouveaux messages'
    },
    {
      key: 'paiement_recu' as const,
      icon: CreditCard,
      label: 'Paiements reçus',
      description: 'Notification quand un paiement est reçu'
    },
    {
      key: 'rappel_paiement' as const,
      icon: Bell,
      label: 'Rappels de paiement',
      description: 'Rappels 5 jours avant la date d\'échéance'
    },
    {
      key: 'retard_paiement' as const,
      icon: Bell,
      label: 'Retards de paiement',
      description: 'Alertes pour les paiements en retard'
    },
    {
      key: 'nouveau_ticket' as const,
      icon: Wrench,
      label: 'Nouveaux tickets de maintenance',
      description: 'Notification lors de la création d\'un ticket'
    },
    {
      key: 'mise_a_jour_ticket' as const,
      icon: Wrench,
      label: 'Mises à jour des tickets',
      description: 'Notification quand le statut d\'un ticket change'
    },
    {
      key: 'document_a_signer' as const,
      icon: FileText,
      label: 'Documents à signer',
      description: 'Notification pour les nouveaux documents nécessitant une signature'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto p-6 max-w-3xl">
        <PageHeader
          title="Préférences de notification"
          description="Choisissez les types de notifications que vous souhaitez recevoir"
          backTo="/dashboard"
        />
        <Card>
          <CardContent className="space-y-6 pt-6">
            {notificationTypes.map(({ key, icon: Icon, label, description }) => (
              <div key={key} className="flex items-start justify-between space-x-4 pb-4 border-b last:border-0">
                <div className="flex items-start space-x-3 flex-1">
                  <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="space-y-1">
                    <Label htmlFor={key} className="text-base cursor-pointer">
                      {label}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {description}
                    </p>
                  </div>
                </div>
                <Switch
                  id={key}
                  checked={preferences[key]}
                  onCheckedChange={(checked) => 
                    updatePreferences({ [key]: checked })
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotificationSettings;
