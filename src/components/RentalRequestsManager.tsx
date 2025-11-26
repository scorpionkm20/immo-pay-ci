import { useState, useEffect } from 'react';
import { useRentalRequests } from '@/hooks/useRentalRequests';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, XCircle, Clock, User, Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { RejectionTemplateSelector } from '@/components/RejectionTemplateSelector';
import { useManagementSpaces } from '@/hooks/useManagementSpaces';

interface Property {
  id: string;
  titre: string;
  adresse: string;
  ville: string;
  prix_mensuel: number;
  caution: number;
}

interface Tenant {
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
}

export const RentalRequestsManager = () => {
  const { requests, loading, approveRequest, rejectRequest } = useRentalRequests();
  const { currentSpace } = useManagementSpaces();
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [properties, setProperties] = useState<Record<string, Property>>({});
  const [tenants, setTenants] = useState<Record<string, Tenant>>({});
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchPropertyAndTenantData = async () => {
      const propertyIds = [...new Set(requests.map(r => r.property_id))];
      const tenantIds = [...new Set(requests.map(r => r.tenant_id))];

      if (propertyIds.length > 0) {
        const { data: propertiesData } = await supabase
          .from('properties')
          .select('id, titre, adresse, ville, prix_mensuel, caution')
          .in('id', propertyIds);

        if (propertiesData) {
          const propertiesMap = propertiesData.reduce((acc, prop) => {
            acc[prop.id] = prop;
            return acc;
          }, {} as Record<string, Property>);
          setProperties(propertiesMap);
        }
      }

      if (tenantIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name, phone')
          .in('user_id', tenantIds);

        // Fetch user emails from auth metadata
        const usersData = await Promise.all(
          tenantIds.map(async (id) => {
            const { data: { user } } = await supabase.auth.admin.getUserById(id);
            return user;
          })
        );
        
        if (profilesData && usersData) {
          const tenantsMap = profilesData.reduce((acc, profile) => {
            const user = usersData.find(u => u && u.id === profile.user_id);
            acc[profile.user_id] = {
              user_id: profile.user_id,
              full_name: profile.full_name,
              email: user?.email || '',
              phone: profile.phone
            };
            return acc;
          }, {} as Record<string, Tenant>);
          setTenants(tenantsMap);
        }
      }
    };

    if (requests.length > 0) {
      fetchPropertyAndTenantData();
    }
  }, [requests]);

  const handleApprove = async () => {
    if (!selectedRequest || !startDate) return;

    const request = requests.find(r => r.id === selectedRequest);
    if (!request) return;

    const property = properties[request.property_id];
    if (!property) return;

    setSubmitting(true);
    const result = await approveRequest(
      selectedRequest,
      startDate,
      property.prix_mensuel,
      property.caution
    );
    setSubmitting(false);

    if (!result.error) {
      setApproveDialogOpen(false);
      setSelectedRequest(null);
      setStartDate('');
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    setSubmitting(true);
    const result = await rejectRequest(selectedRequest, rejectionReason || undefined);
    setSubmitting(false);

    if (!result.error) {
      setRejectDialogOpen(false);
      setSelectedRequest(null);
      setRejectionReason('');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> En attente</Badge>;
      case 'approved':
        return <Badge className="gap-1 bg-green-500"><CheckCircle2 className="h-3 w-3" /> Approuvée</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Rejetée</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Annulée</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const pendingRequests = requests.filter(r => r.request_status === 'pending');
  const processedRequests = requests.filter(r => r.request_status !== 'pending');

  if (loading) {
    return <div className="text-center p-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Demandes en attente */}
      <Card>
        <CardHeader>
          <CardTitle>Demandes en attente</CardTitle>
          <CardDescription>
            {pendingRequests.length} demande(s) nécessitant votre attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Aucune demande en attente</p>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map(request => {
                const property = properties[request.property_id];
                const tenant = tenants[request.tenant_id];

                return (
                  <Card key={request.id} className="border-primary/20">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="space-y-2 flex-1">
                          <h3 className="font-semibold text-lg">
                            {property?.titre || 'Chargement...'}
                          </h3>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <p className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              {property?.adresse}, {property?.ville}
                            </p>
                            <p className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              {tenant?.full_name} - {tenant?.email}
                              {tenant?.phone && ` - ${tenant.phone}`}
                            </p>
                            <p className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              Demandé le {format(new Date(request.created_at), 'PPP', { locale: fr })}
                            </p>
                          </div>
                          {request.message && (
                            <p className="text-sm mt-2 p-3 bg-muted rounded-md">
                              {request.message}
                            </p>
                          )}
                          <div className="flex gap-2 text-sm font-semibold pt-2">
                            <span>Loyer: {property?.prix_mensuel?.toLocaleString()} FCFA/mois</span>
                            <span>•</span>
                            <span>Caution: {property?.caution?.toLocaleString()} FCFA</span>
                          </div>
                        </div>
                        <div>{getStatusBadge(request.request_status)}</div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            setSelectedRequest(request.id);
                            setStartDate(request.proposed_start_date || '');
                            setApproveDialogOpen(true);
                          }}
                          className="flex-1"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Approuver
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => {
                            setSelectedRequest(request.id);
                            setRejectDialogOpen(true);
                          }}
                          className="flex-1"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Rejeter
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historique des demandes */}
      {processedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Historique</CardTitle>
            <CardDescription>Demandes traitées</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {processedRequests.map(request => {
                const property = properties[request.property_id];
                const tenant = tenants[request.tenant_id];

                return (
                  <div key={request.id} className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{property?.titre}</p>
                      <p className="text-sm text-muted-foreground">{tenant?.full_name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(request.updated_at), 'PP', { locale: fr })}
                      </span>
                      {getStatusBadge(request.request_status)}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog d'approbation */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approuver la demande de location</DialogTitle>
            <DialogDescription>
              Cette action va créer un bail et facturer la caution au locataire.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Date de début du bail *</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleApprove} disabled={!startDate || submitting}>
              {submitting ? 'Traitement...' : 'Approuver et créer le bail'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de rejet */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter la demande</DialogTitle>
            <DialogDescription>
              Le locataire sera notifié du rejet de sa demande.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {currentSpace && (
              <RejectionTemplateSelector
                spaceId={currentSpace.id}
                value={rejectionReason}
                onChange={setRejectionReason}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={submitting}>
              {submitting ? 'Traitement...' : 'Confirmer le rejet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
