import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePayments } from '@/hooks/usePayments';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PaymentWithDetails {
  id: string;
  montant: number;
  mois_paiement: string;
  date_paiement: string;
  statut: string;
  methode_paiement: string;
  transaction_id: string | null;
  recu_url: string | null;
  lease: {
    property: {
      titre: string;
      adresse: string;
    };
    locataire: {
      full_name: string;
      phone: string;
    };
  };
}

export default function PaymentHistory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { payments, loading, downloadReceipt } = usePayments();
  const [paymentsWithDetails, setPaymentsWithDetails] = useState<PaymentWithDetails[]>([]);

  useEffect(() => {
    const fetchPaymentDetails = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          leases!inner (
            gestionnaire_id,
            locataire_id,
            properties!inner (
              titre,
              adresse
            )
          )
        `)
        .eq('leases.gestionnaire_id', user.id)
        .order('mois_paiement', { ascending: false });

      if (!error && data) {
        // Fetch locataire profiles
        const locataireIds = [...new Set(data.map((p: any) => p.leases.locataire_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, phone')
          .in('user_id', locataireIds);

        const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        const formatted = data.map((payment: any) => ({
          id: payment.id,
          montant: payment.montant,
          mois_paiement: payment.mois_paiement,
          date_paiement: payment.date_paiement,
          statut: payment.statut,
          methode_paiement: payment.methode_paiement,
          transaction_id: payment.transaction_id,
          recu_url: payment.recu_url,
          lease: {
            property: {
              titre: payment.leases.properties.titre,
              adresse: payment.leases.properties.adresse
            },
            locataire: profilesMap.get(payment.leases.locataire_id) || {
              full_name: 'N/A',
              phone: 'N/A'
            }
          }
        }));

        setPaymentsWithDetails(formatted);
      }
    };

    fetchPaymentDetails();
  }, [user, payments]);

  const getStatusBadge = (statut: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      reussi: "default",
      en_cours: "secondary",
      en_attente: "outline",
      echoue: "destructive"
    };
    return <Badge variant={variants[statut] || "outline"}>{statut}</Badge>;
  };

  const filterByStatus = (statut?: string) => {
    if (!statut) return paymentsWithDetails;
    return paymentsWithDetails.filter(p => p.statut === statut);
  };

  const renderPaymentList = (paymentsToShow: PaymentWithDetails[]) => (
    <div className="space-y-4">
      {paymentsToShow.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Aucun paiement dans cette catégorie
        </p>
      ) : (
        paymentsToShow.map(payment => (
          <Card key={payment.id}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{payment.lease.property.titre}</h3>
                  <p className="text-sm text-muted-foreground">{payment.lease.property.adresse}</p>
                </div>
                {getStatusBadge(payment.statut)}
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Locataire</p>
                  <p className="font-medium">{payment.lease.locataire.full_name}</p>
                  <p className="text-xs text-muted-foreground">{payment.lease.locataire.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Montant</p>
                  <p className="font-bold text-xl">{payment.montant} FCFA</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Mois</p>
                  <p className="font-medium">
                    {new Date(payment.mois_paiement).toLocaleDateString('fr-FR', { 
                      year: 'numeric', 
                      month: 'long' 
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date de paiement</p>
                  <p className="font-medium">
                    {new Date(payment.date_paiement).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Méthode</p>
                  <p className="text-sm font-medium">
                    {payment.methode_paiement.replace('_', ' ').toUpperCase()}
                  </p>
                  {payment.transaction_id && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ID: {payment.transaction_id}
                    </p>
                  )}
                </div>
                {payment.statut === 'reussi' && payment.recu_url && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadReceipt(payment.id)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Reçu
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  if (loading) {
    return <div className="container mx-auto p-6">Chargement...</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour
      </Button>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Historique des paiements</CardTitle>
          <CardDescription>
            Tous les paiements effectués pour vos propriétés
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="tous" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="tous">Tous</TabsTrigger>
          <TabsTrigger value="reussi">Réussis</TabsTrigger>
          <TabsTrigger value="en_cours">En cours</TabsTrigger>
          <TabsTrigger value="en_attente">En attente</TabsTrigger>
          <TabsTrigger value="echoue">Échoués</TabsTrigger>
        </TabsList>

        <TabsContent value="tous" className="mt-6">
          {renderPaymentList(paymentsWithDetails)}
        </TabsContent>

        <TabsContent value="reussi" className="mt-6">
          {renderPaymentList(filterByStatus('reussi'))}
        </TabsContent>

        <TabsContent value="en_cours" className="mt-6">
          {renderPaymentList(filterByStatus('en_cours'))}
        </TabsContent>

        <TabsContent value="en_attente" className="mt-6">
          {renderPaymentList(filterByStatus('en_attente'))}
        </TabsContent>

        <TabsContent value="echoue" className="mt-6">
          {renderPaymentList(filterByStatus('echoue'))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
