import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeRentalRequests } from '@/hooks/useRealtimeRentalRequests';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Clock, CheckCircle2, XCircle, TrendingUp, Home, Users, DollarSign, Filter, Search, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface RequestWithDetails {
  id: string;
  tenant_name: string;
  tenant_email: string;
  tenant_phone: string;
  property_title: string;
  property_address: string;
  property_monthly_rent: number;
  property_caution: number;
  message: string;
  proposed_start_date: string;
  request_status: string;
  created_at: string;
}

interface DashboardStats {
  pending: number;
  approved: number;
  rejected: number;
  total_properties: number;
  available_properties: number;
  total_revenue_potential: number;
}

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<RequestWithDetails[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<RequestWithDetails[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    pending: 0,
    approved: 0,
    rejected: 0,
    total_properties: 0,
    available_properties: 0,
    total_revenue_potential: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [properties, setProperties] = useState<Array<{ id: string; titre: string }>>([]);

  // Écouter les nouvelles demandes en temps réel
  useRealtimeRentalRequests({
    managerId: user?.id,
    onNewRequest: () => {
      fetchDashboardData();
    }
  });

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [requests, searchTerm, statusFilter, propertyFilter]);

  const fetchDashboardData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch rental requests with details
      const { data: requestsData, error: requestsError } = await supabase
        .from('rental_requests')
        .select(`
          id,
          tenant_id,
          property_id,
          message,
          proposed_start_date,
          request_status,
          created_at
        `)
        .eq('manager_id', user.id)
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      // Get unique tenant IDs and property IDs
      const tenantIds = [...new Set(requestsData?.map(r => r.tenant_id))];
      const propertyIds = [...new Set(requestsData?.map(r => r.property_id))];

      // Fetch tenant profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone')
        .in('user_id', tenantIds);

      // Fetch auth emails
      const tenantEmails: Record<string, string> = {};
      for (const id of tenantIds) {
        const { data: { user: authUser } } = await supabase.auth.admin.getUserById(id);
        if (authUser?.email) {
          tenantEmails[id] = authUser.email;
        }
      }

      // Fetch properties
      const { data: propertiesData } = await supabase
        .from('properties')
        .select('id, titre, adresse, prix_mensuel, caution, statut')
        .in('id', propertyIds);

      // Combine data
      const requestsWithDetails: RequestWithDetails[] = requestsData?.map(request => {
        const profile = profiles?.find(p => p.user_id === request.tenant_id);
        const property = propertiesData?.find(p => p.id === request.property_id);
        
        return {
          id: request.id,
          tenant_name: profile?.full_name || 'Nom inconnu',
          tenant_email: tenantEmails[request.tenant_id] || '',
          tenant_phone: profile?.phone || '',
          property_title: property?.titre || 'Propriété inconnue',
          property_address: property?.adresse || '',
          property_monthly_rent: property?.prix_mensuel || 0,
          property_caution: property?.caution || 0,
          message: request.message || '',
          proposed_start_date: request.proposed_start_date || '',
          request_status: request.request_status,
          created_at: request.created_at
        };
      }) || [];

      setRequests(requestsWithDetails);

      // Set properties for filter
      const uniqueProperties = propertiesData?.map(p => ({ id: p.id, titre: p.titre })) || [];
      setProperties(uniqueProperties);

      // Calculate stats
      const { data: allProperties } = await supabase
        .from('properties')
        .select('id, prix_mensuel, statut')
        .eq('gestionnaire_id', user.id);

      const dashboardStats: DashboardStats = {
        pending: requestsWithDetails.filter(r => r.request_status === 'pending').length,
        approved: requestsWithDetails.filter(r => r.request_status === 'approved').length,
        rejected: requestsWithDetails.filter(r => r.request_status === 'rejected').length,
        total_properties: allProperties?.length || 0,
        available_properties: allProperties?.filter(p => p.statut === 'disponible').length || 0,
        total_revenue_potential: allProperties?.reduce((sum, p) => sum + (p.prix_mensuel || 0), 0) || 0
      };

      setStats(dashboardStats);
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
    let filtered = [...requests];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.request_status === statusFilter);
    }

    // Apply property filter
    if (propertyFilter !== 'all') {
      filtered = filtered.filter(r => r.property_title === propertyFilter);
    }

    // Apply search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.tenant_name.toLowerCase().includes(term) ||
        r.tenant_email.toLowerCase().includes(term) ||
        r.property_title.toLowerCase().includes(term)
      );
    }

    setFilteredRequests(filtered);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />En attente</Badge>;
      case 'approved':
        return <Badge variant="default"><CheckCircle2 className="h-3 w-3 mr-1" />Approuvée</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejetée</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="container mx-auto p-6">Chargement...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-3xl font-bold mt-4">Tableau de bord gestionnaire</h1>
          <p className="text-muted-foreground mt-2">Vue d'ensemble de vos demandes de location</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card className="col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">demandes à traiter</p>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approuvées</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">baux créés</p>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejetées</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rejected}</div>
            <p className="text-xs text-muted-foreground">demandes refusées</p>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Propriétés</CardTitle>
            <Home className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_properties}</div>
            <p className="text-xs text-muted-foreground">{stats.available_properties} disponibles</p>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux approbation</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.approved + stats.rejected > 0 
                ? Math.round((stats.approved / (stats.approved + stats.rejected)) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">demandes traitées</p>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenus potentiels</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats.total_revenue_potential / 1000).toFixed(0)}K</div>
            <p className="text-xs text-muted-foreground">FCFA/mois</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtres et recherche
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="approved">Approuvées</SelectItem>
                <SelectItem value="rejected">Rejetées</SelectItem>
              </SelectContent>
            </Select>

            <Select value={propertyFilter} onValueChange={setPropertyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Propriété" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les propriétés</SelectItem>
                {properties.map(property => (
                  <SelectItem key={property.id} value={property.titre}>
                    {property.titre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Requests Tabs */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">
            En attente ({stats.pending})
          </TabsTrigger>
          <TabsTrigger value="all">
            Toutes ({requests.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approuvées ({stats.approved})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejetées ({stats.rejected})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-4">
          {filteredRequests.filter(r => r.request_status === 'pending').length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">Aucune demande en attente</p>
              </CardContent>
            </Card>
          ) : (
            filteredRequests
              .filter(r => r.request_status === 'pending')
              .map(request => (
                <Card key={request.id} className="border-yellow-200">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          {request.tenant_name}
                        </CardTitle>
                        <CardDescription>
                          {request.tenant_email} • {request.tenant_phone}
                        </CardDescription>
                      </div>
                      {getStatusBadge(request.request_status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-2">
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{request.property_title}</span>
                      </div>
                      <p className="text-sm text-muted-foreground pl-6">{request.property_address}</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">Loyer mensuel</p>
                        <p className="text-lg font-bold">{request.property_monthly_rent.toLocaleString()} FCFA</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Caution</p>
                        <p className="text-lg font-bold">{request.property_caution.toLocaleString()} FCFA</p>
                      </div>
                    </div>

                    {request.message && (
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm font-medium mb-1">Message du locataire:</p>
                        <p className="text-sm text-muted-foreground">{request.message}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Date de début souhaitée: {request.proposed_start_date 
                          ? format(new Date(request.proposed_start_date), 'dd MMMM yyyy', { locale: fr })
                          : 'Non spécifiée'}
                      </span>
                      <span className="text-muted-foreground">
                        Reçue le {format(new Date(request.created_at), 'dd/MM/yyyy', { locale: fr })}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        className="flex-1"
                        onClick={() => navigate(`/rental-requests?request=${request.id}`)}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Traiter la demande
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4 mt-4">
          {filteredRequests.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">Aucune demande trouvée</p>
              </CardContent>
            </Card>
          ) : (
            filteredRequests.map(request => (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{request.tenant_name}</CardTitle>
                      <CardDescription>{request.property_title}</CardDescription>
                    </div>
                    {getStatusBadge(request.request_status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(request.created_at), 'dd/MM/yyyy', { locale: fr })}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/rental-requests?request=${request.id}`)}
                    >
                      Voir détails
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4 mt-4">
          {filteredRequests.filter(r => r.request_status === 'approved').map(request => (
            <Card key={request.id} className="border-green-200">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{request.tenant_name}</CardTitle>
                    <CardDescription>{request.property_title}</CardDescription>
                  </div>
                  {getStatusBadge(request.request_status)}
                </div>
              </CardHeader>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4 mt-4">
          {filteredRequests.filter(r => r.request_status === 'rejected').map(request => (
            <Card key={request.id} className="border-red-200">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{request.tenant_name}</CardTitle>
                    <CardDescription>{request.property_title}</CardDescription>
                  </div>
                  {getStatusBadge(request.request_status)}
                </div>
              </CardHeader>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
