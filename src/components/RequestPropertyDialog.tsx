import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRentalRequests } from '@/hooks/useRentalRequests';
import { PaymentSection } from '@/components/PaymentSection';
import { CreditCard, FileText, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface RequestPropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  propertyTitle: string;
  managerId: string;
  spaceId: string;
  monthlyRent: number;
  cautionAmount: number;
  onSuccess?: () => void;
}

type RequestMode = 'select' | 'request' | 'direct-payment' | 'payment-success';

export const RequestPropertyDialog = ({
  open,
  onOpenChange,
  propertyId,
  propertyTitle,
  managerId,
  spaceId,
  monthlyRent,
  cautionAmount,
  onSuccess
}: RequestPropertyDialogProps) => {
  const { createRequest } = useRentalRequests();
  const { toast } = useToast();
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [proposedStartDate, setProposedStartDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<RequestMode>('select');
  const [createdLeaseId, setCreatedLeaseId] = useState<string | null>(null);

  const handleReset = () => {
    setMode('select');
    setMessage('');
    setProposedStartDate('');
    setCreatedLeaseId(null);
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await createRequest({
      property_id: propertyId,
      manager_id: managerId,
      space_id: spaceId,
      message: message || undefined,
      proposed_start_date: proposedStartDate || undefined
    });

    setLoading(false);

    if (!result.error) {
      setMessage('');
      setProposedStartDate('');
      handleClose();
      onSuccess?.();
    }
  };

  const handleDirectPayment = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Vous devez être connecté"
      });
      return;
    }

    setLoading(true);

    try {
      // Calculate total caution as 5x monthly rent
      const calculatedCaution = monthlyRent * 5;
      const startDate = proposedStartDate || new Date().toISOString().split('T')[0];
      
      // Create lease with 'en_attente_caution' status
      const { data: leaseData, error: leaseError } = await supabase
        .from('leases')
        .insert({
          property_id: propertyId,
          locataire_id: user.id,
          gestionnaire_id: managerId,
          space_id: spaceId,
          date_debut: startDate,
          montant_mensuel: monthlyRent,
          caution_montant: calculatedCaution,
          statut: 'en_attente_caution',
          caution_payee: false
        })
        .select()
        .single();

      if (leaseError) {
        throw leaseError;
      }

      // Create a payment record for the caution
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          lease_id: leaseData.id,
          space_id: spaceId,
          montant: calculatedCaution,
          mois_paiement: startDate,
          statut: 'en_attente'
        });

      if (paymentError) {
        console.error('Payment creation error:', paymentError);
        // Don't fail - the lease was created, just log the error
      }

      setCreatedLeaseId(leaseData.id);
      setMode('direct-payment');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de créer le bail"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    // Update property status to 'loue'
    if (createdLeaseId) {
      await supabase
        .from('properties')
        .update({ statut: 'loue' })
        .eq('id', propertyId);

      // Update lease status
      await supabase
        .from('leases')
        .update({ 
          statut: 'actif',
          caution_payee: true,
          date_caution_payee: new Date().toISOString()
        })
        .eq('id', createdLeaseId);
    }

    setMode('payment-success');
    onSuccess?.();
  };

  const totalCaution = monthlyRent * 5; // 5 months as caution

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'select' && 'Comment souhaitez-vous procéder ?'}
            {mode === 'request' && 'Demander la propriété'}
            {mode === 'direct-payment' && 'Paiement de la caution'}
            {mode === 'payment-success' && 'Félicitations !'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'select' && `Propriété : "${propertyTitle}"`}
            {mode === 'request' && `Envoyez une demande d'approbation au gestionnaire`}
            {mode === 'direct-payment' && `Payez la caution pour obtenir immédiatement la propriété`}
            {mode === 'payment-success' && `La propriété est maintenant à vous !`}
          </DialogDescription>
        </DialogHeader>

        {/* Mode Selection */}
        {mode === 'select' && (
          <div className="space-y-4 py-4">
            <Card 
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => setMode('direct-payment')}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <CreditCard className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Payer directement la caution</CardTitle>
                    <CardDescription className="text-xs">
                      Obtenez la propriété immédiatement
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Caution totale :</span>
                  <span className="font-bold text-primary">{totalCaution.toLocaleString()} FCFA</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  5 mois de loyer : 2 mois d'avance + 2 mois de garantie + 1 mois démarcheur
                </p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => setMode('request')}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-secondary rounded-lg">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Demander l'approbation</CardTitle>
                    <CardDescription className="text-xs">
                      Le gestionnaire validera votre demande
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Envoyez un message au gestionnaire. Après approbation, vous pourrez payer la caution pour finaliser.
                </p>
              </CardContent>
            </Card>

            {/* Date de début souhaitée */}
            <div className="space-y-2 pt-2">
              <Label htmlFor="proposedDate">Date de début souhaitée</Label>
              <Input
                id="proposedDate"
                type="date"
                value={proposedStartDate}
                onChange={(e) => setProposedStartDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
        )}

        {/* Request Mode - demande d'approbation */}
        {mode === 'request' && (
          <form onSubmit={handleSubmitRequest}>
            <div className="space-y-4 py-4">
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={() => setMode('select')}
                className="mb-2"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>

              <div className="space-y-2">
                <Label htmlFor="proposedDateRequest">Date de début souhaitée</Label>
                <Input
                  id="proposedDateRequest"
                  type="date"
                  value={proposedStartDate}
                  onChange={(e) => setProposedStartDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message au gestionnaire (optionnel)</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Présentez-vous et expliquez pourquoi vous souhaitez louer cette propriété..."
                  rows={4}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                  Annuler
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Envoi...' : 'Envoyer la demande'}
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* Direct Payment Mode */}
        {mode === 'direct-payment' && (
          <div className="space-y-4 py-4">
            <Button 
              type="button" 
              variant="ghost" 
              size="sm" 
              onClick={() => setMode('select')}
              className="mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>

            {!createdLeaseId ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="proposedDatePayment">Date de début du bail</Label>
                  <Input
                    id="proposedDatePayment"
                    type="date"
                    value={proposedStartDate}
                    onChange={(e) => setProposedStartDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Loyer mensuel :</span>
                    <span className="font-medium">{monthlyRent.toLocaleString()} FCFA</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold border-t pt-2">
                    <span>Caution totale :</span>
                    <span className="text-primary">{totalCaution.toLocaleString()} FCFA</span>
                  </div>
                </div>

                <Button 
                  onClick={handleDirectPayment} 
                  disabled={loading} 
                  className="w-full"
                  size="lg"
                >
                  {loading ? 'Création du bail...' : 'Continuer vers le paiement'}
                </Button>
              </div>
            ) : (
              <PaymentSection
                leaseId={createdLeaseId}
                montant={totalCaution}
                moisPaiement={new Date().toISOString().split('T')[0]}
                isCaution={true}
                propertyTitle={propertyTitle}
                onSuccess={handlePaymentSuccess}
                onClose={handleClose}
              />
            )}
          </div>
        )}

        {/* Payment Success */}
        {mode === 'payment-success' && (
          <div className="py-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-full">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Félicitations !</h3>
              <p className="text-muted-foreground mt-2">
                Votre paiement a été effectué avec succès. La propriété "{propertyTitle}" est maintenant à vous.
              </p>
            </div>
            <Button onClick={handleClose} className="mt-4">
              Fermer
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
