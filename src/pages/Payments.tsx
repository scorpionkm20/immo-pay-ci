import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLeases } from '@/hooks/useLeases';
import { usePayments } from '@/hooks/usePayments';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { CreditCard, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Payments() {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  // FILTRAGE : useLeases filtre automatiquement par rôle et user_id
  const { leases, loading: leasesLoading } = useLeases(userRole);
  const [selectedLeaseId, setSelectedLeaseId] = useState<string>('');
  const { payments, loading: paymentsLoading, createPayment, downloadReceipt } = usePayments(selectedLeaseId);
  const { toast } = useToast();

  const [paymentForm, setPaymentForm] = useState({
    methode_paiement: '',
    numero_telephone: '',
    mois_paiement: new Date().toISOString().split('T')[0].substring(0, 7)
  });

  // FILTRAGE supplémentaire côté client uniquement pour les baux actifs
  const myLeases = leases.filter(lease => lease.statut === 'actif');

  useEffect(() => {
    if (myLeases.length > 0 && !selectedLeaseId) {
      setSelectedLeaseId(myLeases[0].id);
    }
  }, [myLeases, selectedLeaseId]);

  const selectedLease = leases.find(l => l.id === selectedLeaseId);

  const handlePayment = async () => {
    if (!selectedLeaseId || !paymentForm.methode_paiement || !paymentForm.numero_telephone) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Veuillez remplir tous les champs"
      });
      return;
    }

    await createPayment({
      lease_id: selectedLeaseId,
      montant: selectedLease?.montant_mensuel || 0,
      mois_paiement: paymentForm.mois_paiement,
      methode_paiement: paymentForm.methode_paiement,
      numero_telephone: paymentForm.numero_telephone
    });
  };

  const getStatusBadge = (statut: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      reussi: "default",
      en_cours: "secondary",
      en_attente: "outline",
      echoue: "destructive"
    };
    return <Badge variant={variants[statut] || "outline"}>{statut}</Badge>;
  };

  if (leasesLoading) {
    return <div className="container mx-auto p-6">Chargement...</div>;
  }

  if (myLeases.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <PageHeader title="Paiements" backTo="/dashboard" />
        <Card>
          <CardHeader>
            <CardTitle>Aucun bail actif</CardTitle>
            <CardDescription>Vous n'avez pas de bail actif pour effectuer des paiements</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <PageHeader title="Paiements" backTo="/dashboard" />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Effectuer un paiement
            </CardTitle>
            <CardDescription>Payez votre loyer via Mobile Money</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Sélectionner un bail</Label>
              <Select value={selectedLeaseId} onValueChange={setSelectedLeaseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un bail" />
                </SelectTrigger>
                <SelectContent>
                  {myLeases.map(lease => (
                    <SelectItem key={lease.id} value={lease.id}>
                      Bail - {lease.montant_mensuel} FCFA/mois
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedLease && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium">Montant à payer</p>
                <p className="text-2xl font-bold">{selectedLease.montant_mensuel} FCFA</p>
              </div>
            )}

            <div>
              <Label>Mois de paiement</Label>
              <Input
                type="month"
                value={paymentForm.mois_paiement}
                onChange={(e) => setPaymentForm({ ...paymentForm, mois_paiement: e.target.value })}
              />
            </div>

            <div>
              <Label>Méthode de paiement</Label>
              <Select
                value={paymentForm.methode_paiement}
                onValueChange={(value) => setPaymentForm({ ...paymentForm, methode_paiement: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un opérateur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="orange_money">Orange Money</SelectItem>
                  <SelectItem value="mtn_money">MTN Money</SelectItem>
                  <SelectItem value="moov_money">Moov Money</SelectItem>
                  <SelectItem value="wave">Wave</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Numéro de téléphone</Label>
              <Input
                type="tel"
                placeholder="+221 XX XXX XX XX"
                value={paymentForm.numero_telephone}
                onChange={(e) => setPaymentForm({ ...paymentForm, numero_telephone: e.target.value })}
              />
            </div>

            <Button onClick={handlePayment} className="w-full">
              Payer maintenant
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Historique des paiements</CardTitle>
            <CardDescription>Vos paiements pour ce bail</CardDescription>
          </CardHeader>
          <CardContent>
            {paymentsLoading ? (
              <p className="text-sm text-muted-foreground">Chargement...</p>
            ) : payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun paiement enregistré</p>
            ) : (
              <div className="space-y-4">
                {payments.map(payment => (
                  <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{payment.montant} FCFA</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(payment.mois_paiement).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })}
                      </p>
                      {payment.methode_paiement && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {payment.methode_paiement.replace('_', ' ').toUpperCase()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(payment.statut)}
                      {payment.statut === 'reussi' && payment.recu_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadReceipt(payment.id)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
