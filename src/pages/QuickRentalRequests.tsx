import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeRentalRequests } from '@/hooks/useRealtimeRentalRequests';
import { useRentalRequests } from '@/hooks/useRentalRequests';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, ArrowLeft, User, Home, Calendar, MessageSquare, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { RejectionTemplateSelector } from '@/components/RejectionTemplateSelector';
import { useManagementSpaces } from '@/hooks/useManagementSpaces';

interface RequestWithDetails {
  id: string;
  tenant_name: string;
  tenant_email: string;
  property_title: string;
  property_monthly_rent: number;
  property_caution: number;
  message: string;
  proposed_start_date: string;
  created_at: string;
}

export default function QuickRentalRequests() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { approveRequest, rejectRequest } = useRentalRequests();
  const { currentSpace } = useManagementSpaces();
  
  const [requests, setRequests] = useState<RequestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<RequestWithDetails | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [startDate, setStartDate] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [cautionAmount, setCautionAmount] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchRequests = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: requestsData, error } = await supabase
        .from('rental_requests')
        .select(`
          id,
          tenant_id,
          property_id,
          message,
          proposed_start_date,
          created_at
        `)
        .eq('manager_id', user.id)
        .eq('request_status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const tenantIds = [...new Set(requestsData?.map(r => r.tenant_id))];
      const propertyIds = [...new Set(requestsData?.map(r => r.property_id))];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', tenantIds);

      const tenantEmails: Record<string, string> = {};
      for (const id of tenantIds) {
        const { data: { user: authUser } } = await supabase.auth.admin.getUserById(id);
        if (authUser?.email) {
          tenantEmails[id] = authUser.email;
        }
      }

      const { data: propertiesData } = await supabase
        .from('properties')
        .select('id, titre, prix_mensuel, caution')
        .in('id', propertyIds);

      const requestsWithDetails: RequestWithDetails[] = requestsData?.map(request => {
        const profile = profiles?.find(p => p.user_id === request.tenant_id);
        const property = propertiesData?.find(p => p.id === request.property_id);
        
        return {
          id: request.id,
          tenant_name: profile?.full_name || 'Nom inconnu',
          tenant_email: tenantEmails[request.tenant_id] || '',
          property_title: property?.titre || 'Propriété inconnue',
          property_monthly_rent: property?.prix_mensuel || 0,
          property_caution: property?.caution || 0,
          message: request.message || '',
          proposed_start_date: request.proposed_start_date || '',
          created_at: request.created_at
        };
      }) || [];

      setRequests(requestsWithDetails);
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

  useEffect(() => {
    fetchRequests();
  }, [user]);

  useRealtimeRentalRequests({
    managerId: user?.id,
    onNewRequest: () => {
      fetchRequests();
    }
  });

  const handleApproveClick = (request: RequestWithDetails) => {
    setSelectedRequest(request);
    setActionType('approve');
    setStartDate(request.proposed_start_date || format(new Date(), 'yyyy-MM-dd'));
    setMonthlyRent(request.property_monthly_rent.toString());
    setCautionAmount(request.property_caution.toString());
  };

  const handleRejectClick = (request: RequestWithDetails) => {
    setSelectedRequest(request);
    setActionType('reject');
    setRejectionReason('');
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    setProcessing(true);
    try {
      const { error } = await approveRequest(
        selectedRequest.id,
        startDate,
        parseFloat(monthlyRent),
        parseFloat(cautionAmount)
      );

      if (!error) {
        toast({
          title: "Demande approuvée",
          description: "Le bail a été créé avec succès"
        });
        setActionType(null);
        setSelectedRequest(null);
        fetchRequests();
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    setProcessing(true);
    try {
      const { error } = await rejectRequest(selectedRequest.id, rejectionReason);

      if (!error) {
        toast({
          title: "Demande rejetée",
          description: "Le locataire a été notifié"
        });
        setActionType(null);
        setSelectedRequest(null);
        fetchRequests();
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Button variant="ghost" onClick={() => navigate('/manager-dashboard')} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au tableau de bord
          </Button>
          <h1 className="text-3xl font-bold">Actions rapides</h1>
          <p className="text-muted-foreground">Gérez vos demandes en un clic</p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          {requests.length} {requests.length > 1 ? 'demandes' : 'demande'}
        </Badge>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Aucune demande en attente</p>
              <p className="text-sm text-muted-foreground mt-2">
                Toutes vos demandes ont été traitées
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-250px)]">
          <div className="space-y-4 pr-4">
            {requests.map((request) => (
              <Card key={request.id} className="border-l-4 border-l-yellow-500">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <User className="h-4 w-4" />
                        {request.tenant_name}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {request.tenant_email}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {format(new Date(request.created_at), 'dd MMM', { locale: fr })}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Home className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{request.property_title}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span>{request.property_monthly_rent.toLocaleString()} FCFA/mois</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {request.proposed_start_date 
                            ? format(new Date(request.proposed_start_date), 'dd MMM yyyy', { locale: fr })
                            : 'Date non spécifiée'}
                        </span>
                      </div>
                    </div>
                    {request.message && (
                      <div className="flex items-start gap-2 text-sm bg-muted p-2 rounded">
                        <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <p className="line-clamp-2">{request.message}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => handleApproveClick(request)}
                      className="flex-1"
                      size="sm"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Approuver
                    </Button>
                    <Button
                      onClick={() => handleRejectClick(request)}
                      variant="destructive"
                      className="flex-1"
                      size="sm"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Rejeter
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Approve Dialog */}
      <Dialog open={actionType === 'approve'} onOpenChange={(open) => !open && setActionType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approuver la demande</DialogTitle>
            <DialogDescription>
              Créer le bail pour {selectedRequest?.tenant_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Date de début</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthlyRent">Loyer mensuel (FCFA)</Label>
              <Input
                id="monthlyRent"
                type="number"
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cautionAmount">Montant de la caution (FCFA)</Label>
              <Input
                id="cautionAmount"
                type="number"
                value={cautionAmount}
                onChange={(e) => setCautionAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionType(null)} disabled={processing}>
              Annuler
            </Button>
            <Button onClick={handleApprove} disabled={processing}>
              {processing ? 'Traitement...' : 'Confirmer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={actionType === 'reject'} onOpenChange={(open) => !open && setActionType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter la demande</DialogTitle>
            <DialogDescription>
              Refuser la demande de {selectedRequest?.tenant_name}
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
            <Button variant="outline" onClick={() => setActionType(null)} disabled={processing}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={processing}>
              {processing ? 'Traitement...' : 'Rejeter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
