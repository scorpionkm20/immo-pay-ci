import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLeases, Lease } from '@/hooks/useLeases';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Home, Calendar, DollarSign, CheckCircle, XCircle, FileText, Wrench, CreditCard, ChevronDown, ChevronUp } from 'lucide-react';
import { PaymentSection } from '@/components/PaymentSection';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface LeaseWithProperty extends Lease {
  property?: {
    titre: string;
    adresse: string;
    ville: string;
  };
  locataire?: {
    full_name: string;
    email: string;
  };
  pendingPayment?: {
    id: string;
    montant: number;
    mois_paiement: string;
    isCaution: boolean;
  };
}

const MyLeases = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { leases, loading, refetch } = useLeases(userRole);
  const [myLeases, setMyLeases] = useState<LeaseWithProperty[]>([]);
  const [expandedPayment, setExpandedPayment] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    fetchLeasesWithDetails();
  }, [leases, user, userRole]);

  const fetchLeasesWithDetails = async () => {
    const filteredLeases = leases;

    const leasesWithDetails = await Promise.all(
      filteredLeases.map(async (lease) => {
        const { data: property } = await supabase
          .from('properties')
          .select('titre, adresse, ville')
          .eq('id', lease.property_id)
          .maybeSingle();

        const { data: locataireProfile } = await supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('user_id', lease.locataire_id)
          .maybeSingle();

        // Récupérer le paiement en attente (caution ou loyer)
        let pendingPayment = undefined;
        if (userRole === 'locataire') {
          const { data: payments } = await supabase
            .from('payments')
            .select('id, montant, mois_paiement')
            .eq('lease_id', lease.id)
            .eq('statut', 'en_attente')
            .order('created_at', { ascending: true })
            .limit(1);

          if (payments && payments.length > 0) {
            const payment = payments[0];
            pendingPayment = {
              id: payment.id,
              montant: payment.montant,
              mois_paiement: payment.mois_paiement,
              isCaution: payment.montant === lease.caution_montant && !lease.caution_payee
            };
          }
        }

        return {
          ...lease,
          property: property || undefined,
          locataire: locataireProfile ? {
            full_name: locataireProfile.full_name,
            email: locataireProfile.phone || ''
          } : undefined,
          pendingPayment
        };
      })
    );

    setMyLeases(leasesWithDetails);
  };

  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case 'actif':
        return <Badge className="bg-green-600">Actif</Badge>;
      case 'termine':
        return <Badge variant="secondary">Terminé</Badge>;
      default:
        return <Badge variant="outline">{statut}</Badge>;
    }
  };

  const handlePaymentSuccess = () => {
    refetch();
    setExpandedPayment(null);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-4xl mx-auto px-4">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Mes Baux</h1>
          <p className="text-muted-foreground">
            {myLeases.length} {myLeases.length > 1 ? 'baux' : 'bail'} 
            {userRole === 'locataire' ? ' en cours' : ' gérés'}
          </p>
        </div>

        {myLeases.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-lg text-muted-foreground">
                {userRole === 'locataire' 
                  ? "Vous n'avez aucun bail actif"
                  : "Aucun bail géré pour le moment"
                }
              </p>
              {userRole === 'locataire' && (
                <Button className="mt-4" onClick={() => navigate('/properties')}>
                  Parcourir les annonces
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {myLeases.map((lease) => (
              <Card key={lease.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-xl flex items-center gap-2">
                        <Home className="h-5 w-5" />
                        {lease.property?.titre || 'Propriété'}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {lease.property?.adresse}, {lease.property?.ville}
                      </CardDescription>
                    </div>
                    {getStatusBadge(lease.statut)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Locataire info (for gestionnaires) */}
                  {userRole === 'gestionnaire' && lease.locataire && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-1">Locataire</p>
                      <p className="text-sm">{lease.locataire.full_name}</p>
                      <p className="text-xs text-muted-foreground">{lease.locataire.email}</p>
                    </div>
                  )}

                  {/* Lease details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-start gap-2">
                      <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Période</p>
                        <p className="text-sm text-muted-foreground">
                          Du {new Date(lease.date_debut).toLocaleDateString('fr-FR')}
                        </p>
                        {lease.date_fin && (
                          <p className="text-sm text-muted-foreground">
                            Au {new Date(lease.date_fin).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Loyer mensuel</p>
                        <p className="text-sm font-bold">
                          {lease.montant_mensuel.toLocaleString()} FCFA
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Caution status */}
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Caution</p>
                        <p className="text-sm text-muted-foreground">
                          {lease.caution_montant.toLocaleString()} FCFA
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {lease.caution_payee ? (
                          <>
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <span className="text-sm font-medium text-green-600">Payée</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-5 w-5 text-destructive" />
                            <span className="text-sm font-medium text-destructive">Non payée</span>
                          </>
                        )}
                      </div>
                    </div>
                    {/* Message about contract availability */}
                    {userRole === 'locataire' && !lease.caution_payee && (
                      <div className="mt-2 pt-2 border-t border-border">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          Le contrat de bail sera disponible après le paiement de la caution
                        </p>
                      </div>
                    )}
                    {userRole === 'locataire' && lease.caution_payee && !lease.contrat_url && (
                      <div className="mt-2 pt-2 border-t border-border">
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Caution payée - Le contrat sera bientôt généré par le gestionnaire
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Section de paiement pour locataires avec paiement en attente */}
                  {userRole === 'locataire' && lease.pendingPayment && lease.statut === 'actif' && (
                    <Collapsible
                      open={expandedPayment === lease.id}
                      onOpenChange={(open) => setExpandedPayment(open ? lease.id : null)}
                    >
                      <CollapsibleTrigger asChild>
                        <Button 
                          variant={lease.pendingPayment.isCaution ? "default" : "outline"}
                          className="w-full justify-between"
                        >
                          <span className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            {lease.pendingPayment.isCaution 
                              ? `Payer la caution (${lease.pendingPayment.montant.toLocaleString()} FCFA)`
                              : `Payer le loyer (${lease.pendingPayment.montant.toLocaleString()} FCFA)`
                            }
                          </span>
                          {expandedPayment === lease.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-4">
                        <PaymentSection
                          leaseId={lease.id}
                          montant={lease.pendingPayment.montant}
                          moisPaiement={lease.pendingPayment.mois_paiement}
                          isCaution={lease.pendingPayment.isCaution}
                          propertyTitle={lease.property?.titre}
                          onSuccess={handlePaymentSuccess}
                          onClose={() => setExpandedPayment(null)}
                        />
                      </CollapsibleContent>
                    </Collapsible>
                  )}

                  <div className="flex gap-2 pt-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/properties/${lease.property_id}`)}
                    >
                      Voir la propriété
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/documents?lease=${lease.id}`)}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Documents
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/maintenance?lease=${lease.id}`)}
                    >
                      <Wrench className="h-4 w-4 mr-2" />
                      Maintenance
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyLeases;
