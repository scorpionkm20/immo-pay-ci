import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useManagementSpaces } from '@/hooks/useManagementSpaces';
import { useSpaceStats } from '@/hooks/useSpaceStats';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Navbar } from '@/components/Navbar';
import { Building2, Users, FileText, DollarSign, Wrench, TrendingUp, Home, Clock, AlertCircle, Percent, Download, BarChart3 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, userRole, loading } = useAuth();
  const { currentSpace } = useManagementSpaces();
  const { stats: spaceStats, propertyPerformance, monthlyRevenue, loading: spaceLoading } = useSpaceStats(currentSpace?.id || null);
  const { stats, isLoading: statsLoading } = useDashboardStats();
  const [exportingReport, setExportingReport] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleExportReport = async () => {
    if (!currentSpace) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Aucun espace sélectionné",
      });
      return;
    }

    setExportingReport(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-space-report', {
        body: { spaceId: currentSpace.id },
      });

      if (error) throw error;

      if (data?.html) {
        // Open HTML in new window for printing
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(data.html);
          printWindow.document.close();
        }
        
        toast({
          title: "Rapport généré",
          description: "Le rapport a été ouvert dans une nouvelle fenêtre",
        });
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de générer le rapport",
      });
    } finally {
      setExportingReport(false);
    }
  };

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

  const getGestionnaireStats = () => [
    {
      title: 'Propriétés',
      value: stats?.totalProperties || 0,
      icon: Building2,
      description: 'Propriétés gérées',
      color: 'text-primary',
      bgColor: 'bg-primary-light',
    },
    {
      title: 'Baux Actifs',
      value: stats?.activeLeases || 0,
      icon: Users,
      description: 'Contrats en cours',
      color: 'text-secondary',
      bgColor: 'bg-secondary-light',
    },
    {
      title: 'Tickets Ouverts',
      value: stats?.openTickets || 0,
      icon: Wrench,
      description: 'Demandes de maintenance',
      color: 'text-destructive',
      bgColor: 'bg-red-100',
    },
    {
      title: 'Revenus du Mois',
      value: `${stats?.monthlyRevenue?.toLocaleString() || 0} FCFA`,
      icon: TrendingUp,
      description: 'Paiements reçus',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
  ];

  const getLocataireStats = () => [
    {
      title: 'Baux Actifs',
      value: stats?.activeLeases || 0,
      icon: Home,
      description: 'Logements loués',
      color: 'text-primary',
      bgColor: 'bg-primary-light',
    },
    {
      title: 'Paiements en Attente',
      value: stats?.pendingPayments || 0,
      icon: DollarSign,
      description: 'À payer',
      color: 'text-secondary',
      bgColor: 'bg-secondary-light',
    },
    {
      title: 'Tickets Ouverts',
      value: stats?.openTickets || 0,
      icon: Wrench,
      description: 'Demandes en cours',
      color: 'text-destructive',
      bgColor: 'bg-red-100',
    },
    {
      title: 'Documents',
      value: stats?.unsignedDocuments || 0,
      icon: FileText,
      description: 'À signer',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
  ];

  const statsCards = userRole === 'gestionnaire' ? getGestionnaireStats() : getLocataireStats();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <div className="container py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Tableau de bord {getRoleDisplay(userRole)}
            </h1>
            <p className="text-muted-foreground">
              {currentSpace ? `Espace: ${currentSpace.nom}` : 'Aucun espace sélectionné'}
            </p>
          </div>
          {userRole === 'gestionnaire' && currentSpace && (
            <Button onClick={handleExportReport} disabled={exportingReport}>
              <Download className="h-4 w-4 mr-2" />
              {exportingReport ? 'Export...' : 'Exporter PDF'}
            </Button>
          )}
        </div>

        {/* Space Stats Cards for Gestionnaires */}
        {userRole === 'gestionnaire' && currentSpace && spaceStats && (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Propriétés</CardTitle>
                  <Building2 className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{spaceStats.totalProperties}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {spaceStats.occupiedProperties} occupées
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Taux d'occupation</CardTitle>
                  <Percent className="h-5 w-5 text-secondary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{spaceStats.occupancyRate.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sur {spaceStats.totalProperties} propriétés
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Revenus du mois</CardTitle>
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {spaceStats.monthlyRevenue.toLocaleString('fr-FR')} FCFA
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    / {spaceStats.expectedRevenue.toLocaleString('fr-FR')} FCFA attendus
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Tickets actifs</CardTitle>
                  <Wrench className="h-5 w-5 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{spaceStats.activeTickets}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {spaceStats.pendingPayments} paiements en attente
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-2 mb-8">
              {/* Monthly Revenue Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Évolution des revenus</CardTitle>
                  <CardDescription>Revenus des 6 derniers mois</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                        formatter={(value: any) => `${Number(value).toLocaleString('fr-FR')} FCFA`}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} name="Reçu" />
                      <Line type="monotone" dataKey="expected" stroke="hsl(var(--secondary))" strokeWidth={2} strokeDasharray="5 5" name="Attendu" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Property Performance Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance par propriété</CardTitle>
                  <CardDescription>Revenus mensuels par propriété</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={propertyPerformance}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="propertyTitle" className="text-xs" angle={-45} textAnchor="end" height={100} />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                        formatter={(value: any) => `${Number(value).toLocaleString('fr-FR')} FCFA`}
                      />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Revenus" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Property Performance Table */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Comparaison détaillée</CardTitle>
                  <CardDescription>Performance des propriétés dans l'espace</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Propriété</th>
                          <th className="text-right p-2">Revenus</th>
                          <th className="text-right p-2">Tickets</th>
                        </tr>
                      </thead>
                      <tbody>
                        {propertyPerformance.map((prop) => (
                          <tr key={prop.propertyId} className="border-b hover:bg-muted/50">
                            <td className="p-2">{prop.propertyTitle}</td>
                            <td className="text-right p-2">{prop.revenue.toLocaleString('fr-FR')} FCFA</td>
                            <td className="text-right p-2">{prop.ticketCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))
          ) : (
            statsCards.map((stat, index) => (
              <Card key={index} className="transition-shadow hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Analytics Charts for Gestionnaires */}
        {userRole === 'gestionnaire' && stats?.chartData && (
          <>
            {/* KPI Cards */}
            <div className="grid gap-6 md:grid-cols-3 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Taux d'Occupation</CardTitle>
                  <Percent className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.kpis?.occupancyRate || 0}%</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.activeLeases} / {stats.totalProperties} propriétés occupées
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Délai Moyen de Résolution</CardTitle>
                  <Clock className="h-5 w-5 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.kpis?.avgResolutionTime || 0}h</div>
                  <p className="text-xs text-muted-foreground mt-1">Temps moyen tickets maintenance</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Paiements en Retard</CardTitle>
                  <AlertCircle className="h-5 w-5 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.kpis?.latePayments || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Paiements à relancer</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Grid */}
            <div className="grid gap-6 lg:grid-cols-2 mb-8">
              {/* Monthly Revenue Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenus Mensuels</CardTitle>
                  <CardDescription>Évolution des revenus sur les 12 derniers mois</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={stats.chartData.monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                        formatter={(value: any) => `${Number(value).toLocaleString()} FCFA`}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} name="Revenus" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Revenue by Property Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenus par Propriété</CardTitle>
                  <CardDescription>Top 10 des propriétés les plus rentables</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.chartData.revenueByProperty}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="property" className="text-xs" angle={-45} textAnchor="end" height={100} />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                        formatter={(value: any) => `${Number(value).toLocaleString()} FCFA`}
                      />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Revenus" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Tickets by Status Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Tickets de Maintenance</CardTitle>
                  <CardDescription>Répartition par statut</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={stats.chartData.ticketsByStatus}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={(entry) => `${entry.status}: ${entry.count}`}
                      >
                        {stats.chartData.ticketsByStatus.map((entry: any, index: number) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={
                              entry.status === 'ouvert' ? 'hsl(var(--destructive))' :
                              entry.status === 'en_cours' ? 'hsl(var(--warning))' :
                              'hsl(var(--success))'
                            } 
                          />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Tickets by Priority Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Priorités des Tickets</CardTitle>
                  <CardDescription>Répartition par niveau de priorité</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.chartData.ticketsByPriority}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="priority" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                      <Bar dataKey="count" name="Nombre" fill="hsl(var(--secondary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Actions rapides */}
        <Card>
          <CardHeader>
            <CardTitle>Actions Rapides</CardTitle>
            <CardDescription>Accédez rapidement à vos fonctionnalités principales</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Button onClick={() => navigate('/properties')} variant="outline" className="w-full h-auto py-6 flex flex-col gap-2">
                <Building2 className="h-6 w-6" />
                <span>Voir les Annonces</span>
              </Button>
              
              {userRole === 'gestionnaire' && (
                <>
                  <Button onClick={() => navigate('/my-properties')} variant="outline" className="w-full h-auto py-6 flex flex-col gap-2">
                    <Home className="h-6 w-6" />
                    <span>Mes Propriétés</span>
                  </Button>
                  <Button onClick={() => navigate('/payment-history')} variant="outline" className="w-full h-auto py-6 flex flex-col gap-2">
                    <DollarSign className="h-6 w-6" />
                    <span>Historique Paiements</span>
                  </Button>
                </>
              )}
              
              {(userRole === 'locataire' || userRole === 'gestionnaire') && (
                <>
                  <Button onClick={() => navigate('/my-leases')} variant="outline" className="w-full h-auto py-6 flex flex-col gap-2">
                    <FileText className="h-6 w-6" />
                    <span>Mes Baux</span>
                  </Button>
                  <Button onClick={() => navigate('/messages')} variant="outline" className="w-full h-auto py-6 flex flex-col gap-2">
                    <Users className="h-6 w-6" />
                    <span>Messagerie</span>
                  </Button>
                  <Button onClick={() => navigate('/documents')} variant="outline" className="w-full h-auto py-6 flex flex-col gap-2">
                    <FileText className="h-6 w-6" />
                    <span>Documents</span>
                  </Button>
                  <Button onClick={() => navigate('/maintenance')} variant="outline" className="w-full h-auto py-6 flex flex-col gap-2">
                    <Wrench className="h-6 w-6" />
                    <span>Maintenance</span>
                  </Button>
                </>
              )}
              
              {userRole === 'locataire' && (
                <Button onClick={() => navigate('/payments')} className="w-full h-auto py-6 flex flex-col gap-2">
                  <DollarSign className="h-6 w-6" />
                  <span>Payer mon Loyer</span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
