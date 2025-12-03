import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/PageHeader';
import { Download, Filter, Calendar, CreditCard, Smartphone, AlertCircle, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PaymentWithDetails {
  id: string;
  montant: number;
  mois_paiement: string;
  date_paiement: string | null;
  statut: string;
  methode_paiement: string;
  numero_telephone: string;
  transaction_id: string | null;
  recu_url: string | null;
  created_at: string;
  lease_id: string;
  property_titre: string;
  property_adresse: string;
  is_simulation: boolean;
}

export default function PaymentHistory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState<PaymentWithDetails[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<PaymentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    statut: 'tous',
    periode: 'tous',
    mode: 'tous'
  });
  const [dateRange, setDateRange] = useState({
    debut: '',
    fin: ''
  });

  useEffect(() => {
    fetchPayments();
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [payments, filters, dateRange]);

  const fetchPayments = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get user's leases
      const { data: leases, error: leasesError } = await supabase
        .from('leases')
        .select('id, property_id')
        .eq('locataire_id', user.id);

      if (leasesError) throw leasesError;

      if (!leases || leases.length === 0) {
        setLoading(false);
        return;
      }

      // Get all payments for these leases
      const leaseIds = leases.map(l => l.id);
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .in('lease_id', leaseIds)
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Get property details
      const propertyIds = leases.map(l => l.property_id);
      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select('id, titre, adresse')
        .in('id', propertyIds);

      if (propertiesError) throw propertiesError;

      // Combine data
      const paymentDetails = paymentsData?.map(payment => {
        const lease = leases.find(l => l.id === payment.lease_id);
        const property = properties?.find(p => p.id === lease?.property_id);
        const isSimulation = payment.transaction_id?.startsWith('SIM-') || false;

        return {
          id: payment.id,
          montant: payment.montant,
          mois_paiement: payment.mois_paiement,
          date_paiement: payment.date_paiement,
          statut: payment.statut,
          methode_paiement: payment.methode_paiement,
          numero_telephone: payment.numero_telephone,
          transaction_id: payment.transaction_id,
          recu_url: payment.recu_url,
          created_at: payment.created_at,
          lease_id: payment.lease_id,
          property_titre: property?.titre || 'Propriété inconnue',
          property_adresse: property?.adresse || '',
          is_simulation: isSimulation
        };
      }) || [];

      setPayments(paymentDetails);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...payments];

    // Filter by status
    if (filters.statut !== 'tous') {
      filtered = filtered.filter(p => p.statut === filters.statut);
    }

    // Filter by mode (simulation/production)
    if (filters.mode !== 'tous') {
      filtered = filtered.filter(p => 
        filters.mode === 'simulation' ? p.is_simulation : !p.is_simulation
      );
    }

    // Filter by period
    if (filters.periode !== 'tous') {
      const now = new Date();
      const startDate = new Date();

      switch (filters.periode) {
        case '7j':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30j':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90j':
          startDate.setDate(now.getDate() - 90);
          break;
        case 'custom':
          if (dateRange.debut && dateRange.fin) {
            const debut = new Date(dateRange.debut);
            const fin = new Date(dateRange.fin);
            filtered = filtered.filter(p => {
              const paymentDate = new Date(p.created_at);
              return paymentDate >= debut && paymentDate <= fin;
            });
          }
          break;
      }

      if (filters.periode !== 'custom') {
        filtered = filtered.filter(p => new Date(p.created_at) >= startDate);
      }
    }

    setFilteredPayments(filtered);
  };

  const getStatusIcon = (statut: string) => {
    switch (statut) {
      case 'reussi':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'en_cours':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'echoue':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'en_attente':
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (statut: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      reussi: "default",
      en_cours: "secondary",
      echoue: "destructive",
      en_attente: "outline"
    };

    const labels: Record<string, string> = {
      reussi: "Réussi",
      en_cours: "En cours",
      echoue: "Échoué",
      en_attente: "En attente"
    };

    return (
      <Badge variant={variants[statut] || "secondary"}>
        {labels[statut] || statut}
      </Badge>
    );
  };

  const downloadReceipt = async (paymentId: string) => {
    const { data, error } = await supabase.functions.invoke('generate-receipt', {
      body: { payment_id: paymentId }
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de générer le reçu"
      });
      return;
    }

    toast({
      title: "Reçu téléchargé",
      description: "Le reçu a été généré avec succès"
    });
  };

  const resetFilters = () => {
    setFilters({
      statut: 'tous',
      periode: 'tous',
      mode: 'tous'
    });
    setDateRange({ debut: '', fin: '' });
  };

  if (loading) {
    return <div className="container mx-auto p-6">Chargement...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Historique des paiements"
        description="Consultez l'historique complet de vos transactions"
        backTo="/dashboard"
      />

      {/* Filters Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtres
          </CardTitle>
          <CardDescription>
            Filtrez les paiements par statut, période ou mode de transaction
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="statut-filter">Statut</Label>
              <Select
                value={filters.statut}
                onValueChange={(value) => setFilters(prev => ({ ...prev, statut: value }))}
              >
                <SelectTrigger id="statut-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous les statuts</SelectItem>
                  <SelectItem value="reussi">Réussi</SelectItem>
                  <SelectItem value="en_cours">En cours</SelectItem>
                  <SelectItem value="en_attente">En attente</SelectItem>
                  <SelectItem value="echoue">Échoué</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="periode-filter">Période</Label>
              <Select
                value={filters.periode}
                onValueChange={(value) => setFilters(prev => ({ ...prev, periode: value }))}
              >
                <SelectTrigger id="periode-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Toutes les périodes</SelectItem>
                  <SelectItem value="7j">7 derniers jours</SelectItem>
                  <SelectItem value="30j">30 derniers jours</SelectItem>
                  <SelectItem value="90j">90 derniers jours</SelectItem>
                  <SelectItem value="custom">Personnalisée</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="mode-filter">Mode</Label>
              <Select
                value={filters.mode}
                onValueChange={(value) => setFilters(prev => ({ ...prev, mode: value }))}
              >
                <SelectTrigger id="mode-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous les modes</SelectItem>
                  <SelectItem value="simulation">Simulation</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filters.periode === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date-debut">Date de début</Label>
                <Input
                  id="date-debut"
                  type="date"
                  value={dateRange.debut}
                  onChange={(e) => setDateRange(prev => ({ ...prev, debut: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="date-fin">Date de fin</Label>
                <Input
                  id="date-fin"
                  type="date"
                  value={dateRange.fin}
                  onChange={(e) => setDateRange(prev => ({ ...prev, fin: e.target.value }))}
                />
              </div>
            </div>
          )}

          <Button variant="outline" onClick={resetFilters} className="w-full">
            Réinitialiser les filtres
          </Button>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <Alert>
        <AlertDescription>
          <strong>{filteredPayments.length}</strong> paiement(s) trouvé(s) sur un total de <strong>{payments.length}</strong>
        </AlertDescription>
      </Alert>

      {/* Payments List */}
      {filteredPayments.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Aucun paiement trouvé avec ces critères
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredPayments.map(payment => (
            <Card key={payment.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <CreditCard className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{payment.property_titre}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(payment.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getStatusBadge(payment.statut)}
                    {payment.is_simulation && (
                      <Badge variant="outline" className="text-amber-600 border-amber-600">
                        Simulation
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-xs text-muted-foreground">Montant</span>
                    <p className="font-bold text-lg">{payment.montant.toLocaleString()} FCFA</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Smartphone className="h-3 w-3" />
                      Méthode
                    </span>
                    <p className="font-medium text-sm capitalize">
                      {payment.methode_paiement.replace('_', ' ')}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Téléphone</span>
                    <p className="font-medium text-sm">{payment.numero_telephone}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Période</span>
                    <p className="font-medium text-sm">
                      {new Date(payment.mois_paiement).toLocaleDateString('fr-FR', {
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(payment.statut)}
                    <span className="text-sm font-medium">
                      {payment.statut === 'reussi' && 'Paiement réussi'}
                      {payment.statut === 'en_cours' && 'Paiement en cours de traitement'}
                      {payment.statut === 'echoue' && 'Paiement échoué'}
                      {payment.statut === 'en_attente' && 'Paiement en attente'}
                    </span>
                  </div>

                  {payment.transaction_id && (
                    <div className="p-3 bg-muted rounded-lg">
                      <span className="text-xs text-muted-foreground">ID Transaction</span>
                      <p className="font-mono text-xs break-all mt-1">
                        {payment.transaction_id}
                      </p>
                      {payment.is_simulation && (
                        <p className="text-xs text-amber-600 mt-2">
                          ⚠️ Transaction simulée - Aucun argent réel n'a été débité
                        </p>
                      )}
                    </div>
                  )}

                  {payment.date_paiement && (
                    <p className="text-xs text-muted-foreground">
                      Payé le {new Date(payment.date_paiement).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  )}
                </div>

                {payment.statut === 'reussi' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadReceipt(payment.id)}
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger le reçu
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
