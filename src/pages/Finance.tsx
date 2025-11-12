import { useState } from 'react';
import { useManagementSpaces } from '@/hooks/useManagementSpaces';
import { useFinancialData } from '@/hooks/useFinancialData';
import { useFinancialForecasts } from '@/hooks/useFinancialForecasts';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { FinancialForecastChart } from '@/components/FinancialForecastChart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertCircle,
  Download,
  Plus,
  Calendar,
  PieChart,
  Loader2,
  AlertTriangle,
  Info,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RePieChart, Pie, Cell } from 'recharts';
import { format, subMonths, startOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';

const COLORS = ['#8b5cf6', '#ec4899', '#06b6d4', '#f59e0b', '#10b981'];

export default function Finance() {
  const { currentSpace } = useManagementSpaces();
  const { charges, amortizations, metrics, loading } = useFinancialData(currentSpace?.id);
  const [forecastMonths, setForecastMonths] = useState(6);
  const { historicalData, forecasts, alerts, loading: forecastsLoading } = useFinancialForecasts(
    currentSpace?.id,
    forecastMonths
  );
  const [selectedPeriod, setSelectedPeriod] = useState('6months');
  const [generatingReport, setGeneratingReport] = useState(false);

  const handleGenerateReport = async () => {
    if (!currentSpace) return;

    setGeneratingReport(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Vous devez être connecté');
        return;
      }

      const response = await supabase.functions.invoke('generate-financial-report', {
        body: {
          spaceId: currentSpace.id,
          period: selectedPeriod,
        },
      });

      if (response.error) throw response.error;

      // Ouvrir le rapport dans un nouvel onglet
      const reportWindow = window.open('', '_blank');
      if (reportWindow) {
        reportWindow.document.write(response.data);
        reportWindow.document.close();
        toast.success('Rapport généré avec succès');
      }
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error('Impossible de générer le rapport');
    } finally {
      setGeneratingReport(false);
    }
  };

  if (!currentSpace) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Aucun espace sélectionné</CardTitle>
              <CardDescription>Veuillez sélectionner un espace pour voir les finances</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  // Générer données pour graphiques
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    return {
      month: format(date, 'MMM', { locale: fr }),
      revenus: Math.random() * 50000 + 30000,
      charges: Math.random() * 20000 + 10000,
    };
  });

  const chargesByType = charges.reduce((acc, charge) => {
    const existing = acc.find(item => item.type === charge.type_charge);
    if (existing) {
      existing.value += Number(charge.montant);
    } else {
      acc.push({ type: charge.type_charge, value: Number(charge.montant) });
    }
    return acc;
  }, [] as { type: string; value: number }[]);

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      taxe_fonciere: 'Taxe foncière',
      assurance: 'Assurance',
      entretien: 'Entretien',
      travaux: 'Travaux',
      charges_copropriete: 'Charges copro',
      autre: 'Autre',
    };
    return labels[type] || type;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Gestion Financière</h1>
              <p className="text-muted-foreground">
                Analyse complète de la rentabilité de {currentSpace.nom}
              </p>
            </div>
            <Button onClick={handleGenerateReport} disabled={generatingReport}>
              {generatingReport ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Générer Rapport PDF
                </>
              )}
            </Button>
          </div>

          {/* Métriques principales */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Revenus Total</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics?.totalRevenue.toLocaleString()} FCFA</div>
                  <div className="flex items-center gap-1 text-xs text-green-500">
                    <TrendingUp className="h-3 w-3" />
                    <span>+12.5% vs mois dernier</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Charges Total</CardTitle>
                  <TrendingDown className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics?.totalCharges.toLocaleString()} FCFA</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>Ce mois-ci</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Bénéfice Net</CardTitle>
                  <PieChart className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics?.netProfit.toLocaleString()} FCFA</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>Marge: {metrics?.profitMargin.toFixed(1)}%</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Impayés</CardTitle>
                  <AlertCircle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">
                    {metrics?.overduePayments || 0}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>{metrics?.overdueAmount.toLocaleString()} FCFA</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tabs */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
              <TabsTrigger value="forecasts">Prévisions</TabsTrigger>
              <TabsTrigger value="charges">Charges</TabsTrigger>
              <TabsTrigger value="amortization">Amortissement</TabsTrigger>
              <TabsTrigger value="overdue">Impayés</TabsTrigger>
            </TabsList>

            {/* Forecasts Tab */}
            <TabsContent value="forecasts" className="space-y-4">
              {/* Alertes */}
              {alerts.length > 0 && (
                <div className="space-y-3">
                  {alerts.map((alert, index) => (
                    <Alert
                      key={index}
                      variant={alert.type === 'danger' ? 'destructive' : 'default'}
                      className={
                        alert.type === 'info' 
                          ? 'border-blue-500 bg-blue-50' 
                          : alert.type === 'warning'
                          ? 'border-orange-500 bg-orange-50'
                          : ''
                      }
                    >
                      {alert.type === 'danger' && <AlertTriangle className="h-4 w-4" />}
                      {alert.type === 'warning' && <AlertCircle className="h-4 w-4" />}
                      {alert.type === 'info' && <Info className="h-4 w-4" />}
                      <AlertTitle className="flex items-center gap-2">
                        {alert.title}
                        {alert.trend !== undefined && (
                          <Badge variant={alert.trend > 0 ? 'default' : 'destructive'}>
                            {alert.trend > 0 ? (
                              <ArrowUpRight className="h-3 w-3 mr-1" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3 mr-1" />
                            )}
                            {Math.abs(alert.trend).toFixed(1)}%
                          </Badge>
                        )}
                      </AlertTitle>
                      <AlertDescription>{alert.message}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}

              {/* Contrôle de période */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Configuration des Prévisions</CardTitle>
                      <CardDescription>
                        Ajustez la période de projection
                      </CardDescription>
                    </div>
                    <Select
                      value={forecastMonths.toString()}
                      onValueChange={(value) => setForecastMonths(parseInt(value))}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 mois</SelectItem>
                        <SelectItem value="6">6 mois</SelectItem>
                        <SelectItem value="9">9 mois</SelectItem>
                        <SelectItem value="12">12 mois</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
              </Card>

              {forecastsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : historicalData.length < 3 ? (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="font-medium">Données insuffisantes</p>
                      <p className="text-sm mt-2">
                        Au moins 3 mois de données historiques sont nécessaires pour générer des prévisions
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Graphiques de prévision */}
                  <div className="grid grid-cols-1 gap-4">
                    <FinancialForecastChart
                      historicalData={historicalData}
                      forecasts={forecasts}
                      metric="revenue"
                    />
                    <FinancialForecastChart
                      historicalData={historicalData}
                      forecasts={forecasts}
                      metric="charges"
                    />
                    <FinancialForecastChart
                      historicalData={historicalData}
                      forecasts={forecasts}
                      metric="profit"
                    />
                    <FinancialForecastChart
                      historicalData={historicalData}
                      forecasts={forecasts}
                      metric="cashflow"
                    />
                  </div>

                  {/* Tableau des prévisions */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Détail des Prévisions</CardTitle>
                      <CardDescription>
                        Projection mois par mois avec niveau de confiance
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Mois</TableHead>
                            <TableHead>Revenus projetés</TableHead>
                            <TableHead>Charges projetées</TableHead>
                            <TableHead>Bénéfice projeté</TableHead>
                            <TableHead>Cash-flow cumulé</TableHead>
                            <TableHead>Confiance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {forecasts.map((forecast) => (
                            <TableRow key={forecast.month}>
                              <TableCell className="font-medium">
                                {format(forecast.date, 'MMMM yyyy', { locale: fr })}
                              </TableCell>
                              <TableCell className="amount">
                                {forecast.projectedRevenue.toLocaleString()} FCFA
                              </TableCell>
                              <TableCell className="amount negative">
                                {forecast.projectedCharges.toLocaleString()} FCFA
                              </TableCell>
                              <TableCell className={`amount ${forecast.projectedProfit >= 0 ? '' : 'negative'}`}>
                                {forecast.projectedProfit.toLocaleString()} FCFA
                              </TableCell>
                              <TableCell className={`amount ${forecast.projectedCashFlow >= 0 ? '' : 'negative'}`}>
                                {forecast.projectedCashFlow.toLocaleString()} FCFA
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={
                                    forecast.confidence >= 80 ? 'default' : 
                                    forecast.confidence >= 60 ? 'secondary' : 
                                    'outline'
                                  }
                                >
                                  {forecast.confidence}%
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Évolution Revenus vs Charges</CardTitle>
                    <CardDescription>6 derniers mois</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="revenus" stroke="#10b981" strokeWidth={2} name="Revenus" />
                        <Line type="monotone" dataKey="charges" stroke="#ef4444" strokeWidth={2} name="Charges" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Répartition des Charges</CardTitle>
                    <CardDescription>Par type de charge</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RePieChart>
                        <Pie
                          data={chargesByType}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => getTypeLabel(entry.type)}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {chargesByType.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RePieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Charges Tab */}
            <TabsContent value="charges" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Liste des Charges</CardTitle>
                      <CardDescription>Toutes les charges de l'espace</CardDescription>
                    </div>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter une charge
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}
                    </div>
                  ) : charges.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Aucune charge enregistrée
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Montant</TableHead>
                          <TableHead>Récurrence</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {charges.map((charge) => (
                          <TableRow key={charge.id}>
                            <TableCell>
                              {format(new Date(charge.date_charge), 'dd/MM/yyyy')}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{getTypeLabel(charge.type_charge)}</Badge>
                            </TableCell>
                            <TableCell>{charge.description || '-'}</TableCell>
                            <TableCell className="text-right font-medium">
                              {Number(charge.montant).toLocaleString()} FCFA
                            </TableCell>
                            <TableCell>
                              {charge.recurrent ? (
                                <Badge>{charge.frequence}</Badge>
                              ) : (
                                <span className="text-muted-foreground">Unique</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Amortization Tab */}
            <TabsContent value="amortization" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Tableau d'Amortissement</CardTitle>
                      <CardDescription>Dépréciation des biens immobiliers</CardDescription>
                    </div>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter un bien
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-64" />
                  ) : amortizations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Aucun amortissement configuré
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {amortizations.map((amort) => {
                        const currentYear = new Date().getFullYear() - new Date(amort.date_acquisition).getFullYear();
                        const annualAmount = (amort.valeur_acquisition - amort.valeur_residuelle) / amort.duree_amortissement;
                        const cumulatedAmount = annualAmount * currentYear;
                        const remainingValue = Math.max(
                          amort.valeur_acquisition - cumulatedAmount,
                          amort.valeur_residuelle
                        );
                        
                        return (
                          <div key={amort.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-semibold">Bien #{amort.property_id.slice(0, 8)}</h3>
                                <p className="text-sm text-muted-foreground">
                                  Acquis le {format(new Date(amort.date_acquisition), 'dd/MM/yyyy')}
                                </p>
                              </div>
                              <Badge>{amort.duree_amortissement} ans</Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Valeur acquisition</p>
                                <p className="font-semibold">{Number(amort.valeur_acquisition).toLocaleString()} FCFA</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Amortissement annuel</p>
                                <p className="font-semibold">{annualAmount.toLocaleString()} FCFA</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Valeur actuelle</p>
                                <p className="font-semibold text-primary">{remainingValue.toLocaleString()} FCFA</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Overdue Tab */}
            <TabsContent value="overdue" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Gestion des Impayés</CardTitle>
                  <CardDescription>Paiements en retard et relances automatiques</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucun impayé actuellement</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
