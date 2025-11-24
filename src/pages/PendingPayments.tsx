import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePayments } from '@/hooks/usePayments';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, CreditCard, Home } from 'lucide-react';

interface PendingPaymentWithDetails {
  id: string;
  montant: number;
  mois_paiement: string;
  statut: string;
  lease_id: string;
  property_titre: string;
  property_adresse: string;
  is_caution: boolean;
}

export default function PendingPayments() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createPayment } = usePayments();
  const { toast } = useToast();
  const [pendingPayments, setPendingPayments] = useState<PendingPaymentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentForm, setPaymentForm] = useState<{
    payment_id: string;
    methode_paiement: string;
    numero_telephone: string;
  }>({
    payment_id: '',
    methode_paiement: 'mobile_money',
    numero_telephone: ''
  });

  useEffect(() => {
    fetchPendingPayments();
  }, [user]);

  const fetchPendingPayments = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get user's leases
      const { data: leases, error: leasesError } = await supabase
        .from('leases')
        .select('id, property_id, caution_montant, locataire_id')
        .eq('locataire_id', user.id)
        .eq('statut', 'actif');

      if (leasesError) throw leasesError;

      if (!leases || leases.length === 0) {
        setLoading(false);
        return;
      }

      // Get pending payments for these leases
      const leaseIds = leases.map(l => l.id);
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*, leases!inner(property_id)')
        .in('lease_id', leaseIds)
        .eq('statut', 'en_attente');

      if (paymentsError) throw paymentsError;

      // Get property details
      const propertyIds = leases.map(l => l.property_id);
      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select('id, titre, adresse')
        .in('id', propertyIds);

      if (propertiesError) throw propertiesError;

      // Combine data
      const paymentDetails = payments?.map(payment => {
        const lease = leases.find(l => l.id === payment.lease_id);
        const property = properties?.find(p => p.id === lease?.property_id);
        const isCaution = payment.montant === lease?.caution_montant;

        return {
          id: payment.id,
          montant: payment.montant,
          mois_paiement: payment.mois_paiement,
          statut: payment.statut,
          lease_id: payment.lease_id,
          property_titre: property?.titre || 'Propriété inconnue',
          property_adresse: property?.adresse || '',
          is_caution: isCaution
        };
      }) || [];

      // Sort: caution payments first
      paymentDetails.sort((a, b) => {
        if (a.is_caution && !b.is_caution) return -1;
        if (!a.is_caution && b.is_caution) return 1;
        return 0;
      });

      setPendingPayments(paymentDetails);
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

  const handlePayment = async (payment: PendingPaymentWithDetails) => {
    if (!paymentForm.numero_telephone) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Veuillez entrer votre numéro de téléphone"
      });
      return;
    }

    const { error } = await createPayment({
      lease_id: payment.lease_id,
      montant: payment.montant,
      mois_paiement: payment.mois_paiement,
      methode_paiement: paymentForm.methode_paiement,
      numero_telephone: paymentForm.numero_telephone
    });

    if (!error) {
      fetchPendingPayments();
      setPaymentForm({
        payment_id: '',
        methode_paiement: 'mobile_money',
        numero_telephone: ''
      });
    }
  };

  if (loading) {
    return <div className="container mx-auto p-6">Chargement...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Button variant="ghost" onClick={() => navigate('/dashboard')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Retour
      </Button>

      <div>
        <h1 className="text-3xl font-bold">Paiements en attente</h1>
        <p className="text-muted-foreground mt-2">
          Complétez vos paiements pour valider vos baux
        </p>
      </div>

      {pendingPayments.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Aucun paiement en attente
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {pendingPayments.map(payment => (
            <Card key={payment.id} className={payment.is_caution ? 'border-primary' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      {payment.is_caution ? (
                        <CreditCard className="h-5 w-5 text-primary" />
                      ) : (
                        <Home className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <CardTitle>
                        {payment.is_caution ? '🔑 Caution - ' : ''}
                        {payment.property_titre}
                      </CardTitle>
                      <CardDescription>{payment.property_adresse}</CardDescription>
                    </div>
                  </div>
                  <Badge variant={payment.is_caution ? 'default' : 'secondary'}>
                    {payment.is_caution ? 'Prioritaire' : 'En attente'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Montant à payer</span>
                    <span className="text-2xl font-bold">{payment.montant.toLocaleString()} FCFA</span>
                  </div>
                  {payment.is_caution && (
                    <p className="text-xs text-muted-foreground mt-2">
                      ⚠️ Le paiement de la caution est requis pour valider votre bail et accéder au chat avec le gestionnaire
                    </p>
                  )}
                </div>

                <div className="grid gap-4">
                  <div>
                    <Label htmlFor={`methode-${payment.id}`}>Méthode de paiement</Label>
                    <Select
                      value={paymentForm.payment_id === payment.id ? paymentForm.methode_paiement : 'mobile_money'}
                      onValueChange={(value) => setPaymentForm(prev => ({
                        ...prev,
                        payment_id: payment.id,
                        methode_paiement: value
                      }))}
                    >
                      <SelectTrigger id={`methode-${payment.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mobile_money">Mobile Money</SelectItem>
                        <SelectItem value="wave">Wave</SelectItem>
                        <SelectItem value="orange_money">Orange Money</SelectItem>
                        <SelectItem value="moov_money">Moov Money</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor={`phone-${payment.id}`}>Numéro de téléphone</Label>
                    <Input
                      id={`phone-${payment.id}`}
                      type="tel"
                      placeholder="Ex: 0707070707"
                      value={paymentForm.payment_id === payment.id ? paymentForm.numero_telephone : ''}
                      onChange={(e) => setPaymentForm(prev => ({
                        ...prev,
                        payment_id: payment.id,
                        numero_telephone: e.target.value
                      }))}
                    />
                  </div>

                  <Button 
                    onClick={() => handlePayment(payment)}
                    className="w-full"
                    size="lg"
                  >
                    Payer maintenant
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
