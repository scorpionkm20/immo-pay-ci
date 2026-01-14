import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReceiptUploadDialog } from './ReceiptUploadDialog';
import { GenerateContractDialog } from './GenerateContractDialog';
import { 
  Home, 
  User, 
  Clock, 
  Upload, 
  CheckCircle, 
  AlertTriangle,
  FileText,
  Calendar,
  DollarSign,
  Eye,
  TrendingUp
} from 'lucide-react';
import { format, differenceInDays, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

interface LeaseWithDetails {
  id: string;
  property_id: string;
  property_title: string;
  property_address: string;
  locataire_id: string;
  tenant_name: string;
  tenant_phone: string;
  date_debut: string;
  montant_mensuel: number;
  caution_montant: number;
  caution_payee: boolean;
  payment_status: string;
  receipt_url: string | null;
  receipt_uploaded_at: string | null;
  tenant_confirmed_at: string | null;
  advance_months_count: number;
  caution_months_count: number;
  agency_months_count: number;
  advance_months_consumed: number;
  first_regular_payment_date: string | null;
  statut: string;
  space_id: string;
}

export const ManagerLeasesDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [leases, setLeases] = useState<LeaseWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLease, setSelectedLease] = useState<LeaseWithDetails | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchLeases();
    }
  }, [user]);

  const fetchLeases = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: leasesData, error } = await supabase
        .from('leases')
        .select('*')
        .eq('gestionnaire_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich with property and tenant details
      const enrichedLeases = await Promise.all(
        (leasesData || []).map(async (lease) => {
          const [propertyResult, tenantResult] = await Promise.all([
            supabase.from('properties').select('titre, adresse, ville').eq('id', lease.property_id).single(),
            supabase.from('profiles').select('full_name, phone').eq('user_id', lease.locataire_id).single()
          ]);

          return {
            ...lease,
            property_title: propertyResult.data?.titre || 'Propriété',
            property_address: `${propertyResult.data?.adresse || ''}, ${propertyResult.data?.ville || ''}`,
            tenant_name: tenantResult.data?.full_name || 'Locataire',
            tenant_phone: tenantResult.data?.phone || ''
          } as LeaseWithDetails;
        })
      );

      setLeases(enrichedLeases);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (lease: LeaseWithDetails) => {
    if (lease.payment_status === 'verified' && lease.caution_payee) {
      return <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Actif</Badge>;
    }
    if (lease.payment_status === 'awaiting_tenant_confirmation') {
      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Attente confirmation</Badge>;
    }
    if (lease.payment_status === 'overdue') {
      return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />En retard</Badge>;
    }
    return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />En attente paiement</Badge>;
  };

  const getAdvanceConsumptionPercentage = (lease: LeaseWithDetails) => {
    const total = lease.advance_months_count || 2;
    const consumed = lease.advance_months_consumed || 0;
    return Math.min((consumed / total) * 100, 100);
  };

  const pendingLeases = leases.filter(l => l.payment_status === 'pending');
  const awaitingConfirmation = leases.filter(l => l.payment_status === 'awaiting_tenant_confirmation');
  const activeLeases = leases.filter(l => l.payment_status === 'verified' && l.caution_payee);

  if (loading) {
    return <div className="text-center p-8">Chargement des baux...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">En attente paiement</CardTitle>
            <DollarSign className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingLeases.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">À confirmer</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{awaitingConfirmation.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Baux actifs</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeLeases.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Revenus mensuels</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeLeases.reduce((sum, l) => sum + l.montant_mensuel, 0).toLocaleString()} <span className="text-sm font-normal">FCFA</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">
            En attente ({pendingLeases.length + awaitingConfirmation.length})
          </TabsTrigger>
          <TabsTrigger value="active">
            Actifs ({activeLeases.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            Tous ({leases.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-4">
          {pendingLeases.length === 0 && awaitingConfirmation.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Aucun bail en attente
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Baux en attente de paiement */}
              {pendingLeases.map(lease => (
                <Card key={lease.id} className="border-amber-200">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Home className="h-5 w-5" />
                          {lease.property_title}
                        </CardTitle>
                        <CardDescription>{lease.property_address}</CardDescription>
                      </div>
                      {getStatusBadge(lease)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{lease.tenant_name}</span>
                      {lease.tenant_phone && <span className="text-muted-foreground">- {lease.tenant_phone}</span>}
                    </div>

                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex justify-between text-sm mb-2">
                        <span>Montant dû</span>
                        <span className="font-bold text-primary">{lease.caution_montant.toLocaleString()} FCFA</span>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div className="flex justify-between">
                          <span>Avance ({lease.advance_months_count || 2} mois)</span>
                          <span>{(lease.montant_mensuel * (lease.advance_months_count || 2)).toLocaleString()} FCFA</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Caution ({lease.caution_months_count || 2} mois)</span>
                          <span>{(lease.montant_mensuel * (lease.caution_months_count || 2)).toLocaleString()} FCFA</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Agence ({lease.agency_months_count || 1} mois)</span>
                          <span>{(lease.montant_mensuel * (lease.agency_months_count || 1)).toLocaleString()} FCFA</span>
                        </div>
                      </div>
                    </div>

                    <Button 
                      onClick={() => {
                        setSelectedLease(lease);
                        setUploadDialogOpen(true);
                      }}
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Uploader le reçu de paiement
                    </Button>
                  </CardContent>
                </Card>
              ))}

              {/* Baux en attente de confirmation */}
              {awaitingConfirmation.map(lease => (
                <Card key={lease.id} className="border-blue-200">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Home className="h-5 w-5" />
                          {lease.property_title}
                        </CardTitle>
                        <CardDescription>{lease.property_address}</CardDescription>
                      </div>
                      {getStatusBadge(lease)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{lease.tenant_name}</span>
                    </div>

                    <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        <Clock className="h-4 w-4 inline mr-2" />
                        Reçu uploadé le {format(new Date(lease.receipt_uploaded_at!), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                        En attente de confirmation par le locataire
                      </p>
                    </div>

                    <Button variant="outline" asChild>
                      <a href={lease.receipt_url!} target="_blank" rel="noopener noreferrer">
                        <Eye className="h-4 w-4 mr-2" />
                        Voir le reçu uploadé
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-4 mt-4">
          {activeLeases.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Aucun bail actif
              </CardContent>
            </Card>
          ) : (
            activeLeases.map(lease => (
              <Card key={lease.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Home className="h-5 w-5" />
                        {lease.property_title}
                      </CardTitle>
                      <CardDescription>{lease.property_address}</CardDescription>
                    </div>
                    {getStatusBadge(lease)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{lease.tenant_name}</span>
                    {lease.tenant_phone && <span className="text-muted-foreground">- {lease.tenant_phone}</span>}
                  </div>

                  {/* Indicateur de consommation des mois d'avance */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Consommation avance</span>
                      <span className="font-medium">
                        {lease.advance_months_consumed || 0}/{lease.advance_months_count || 2} mois
                      </span>
                    </div>
                    <Progress value={getAdvanceConsumptionPercentage(lease)} />
                    {lease.first_regular_payment_date && (
                      <p className="text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3 inline mr-1" />
                        Prochain loyer dû le {format(new Date(lease.first_regular_payment_date), 'dd MMMM yyyy', { locale: fr })}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSelectedLease(lease);
                        setContractDialogOpen(true);
                      }}
                      className="flex-1"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Générer contrat
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4 mt-4">
          {leases.map(lease => (
            <Card key={lease.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{lease.property_title}</p>
                    <p className="text-sm text-muted-foreground">{lease.tenant_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(lease.date_debut), 'dd/MM/yyyy')}
                    </span>
                    {getStatusBadge(lease)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {selectedLease && (
        <>
          <ReceiptUploadDialog
            open={uploadDialogOpen}
            onOpenChange={setUploadDialogOpen}
            leaseId={selectedLease.id}
            propertyTitle={selectedLease.property_title}
            tenantName={selectedLease.tenant_name}
            totalAmount={selectedLease.caution_montant}
            onSuccess={fetchLeases}
          />

          <GenerateContractDialog
            open={contractDialogOpen}
            onOpenChange={setContractDialogOpen}
            leaseId={selectedLease.id}
            spaceId={selectedLease.space_id}
            cautionPayee={selectedLease.caution_payee}
            onSuccess={fetchLeases}
          />
        </>
      )}
    </div>
  );
};
