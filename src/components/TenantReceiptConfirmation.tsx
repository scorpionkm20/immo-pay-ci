import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileCheck, Eye, CheckCircle, XCircle, Loader2, AlertTriangle, Download } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface LeaseWithReceipt {
  id: string;
  property_title: string;
  property_address: string;
  caution_montant: number;
  receipt_url: string;
  receipt_uploaded_at: string;
  advance_months_count: number;
  caution_months_count: number;
  agency_months_count: number;
  montant_mensuel: number;
}

interface TenantReceiptConfirmationProps {
  lease: LeaseWithReceipt;
  onConfirm?: () => void;
}

export const TenantReceiptConfirmation = ({ lease, onConfirm }: TenantReceiptConfirmationProps) => {
  const { toast } = useToast();
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleConfirm = async () => {
    setProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      // Update lease status
      const { error: updateError } = await supabase
        .from('leases')
        .update({
          caution_payee: true,
          date_caution_payee: new Date().toISOString(),
          payment_status: 'verified',
          tenant_confirmed_at: new Date().toISOString(),
          statut: 'actif'
        })
        .eq('id', lease.id);

      if (updateError) throw updateError;

      // Update property status to 'loue'
      const { data: leaseData } = await supabase
        .from('leases')
        .select('property_id, gestionnaire_id')
        .eq('id', lease.id)
        .single();

      if (leaseData) {
        await supabase
          .from('properties')
          .update({ statut: 'loue' })
          .eq('id', leaseData.property_id);

        // Notify manager
        await supabase.from('notifications').insert({
          user_id: leaseData.gestionnaire_id,
          lease_id: lease.id,
          type: 'payment_confirmed',
          titre: 'Paiement confirmé par le locataire',
          message: `Le locataire a confirmé la réception du paiement pour ${lease.property_title}. Le contrat peut maintenant être généré.`
        });
      }

      toast({
        title: 'Paiement confirmé',
        description: 'Votre confirmation a été enregistrée. Le contrat sera bientôt disponible.'
      });

      setConfirmDialogOpen(false);
      onConfirm?.();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.message
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDispute = async () => {
    setProcessing(true);

    try {
      const { data: leaseData } = await supabase
        .from('leases')
        .select('gestionnaire_id')
        .eq('id', lease.id)
        .single();

      if (leaseData) {
        await supabase.from('notifications').insert({
          user_id: leaseData.gestionnaire_id,
          lease_id: lease.id,
          type: 'payment_disputed',
          titre: 'Contestation du reçu de paiement',
          message: `Le locataire conteste le reçu uploadé pour ${lease.property_title}. Veuillez vérifier et reuploader si nécessaire.`
        });
      }

      toast({
        title: 'Contestation envoyée',
        description: 'Le gestionnaire a été notifié de votre contestation.'
      });

      setDisputeDialogOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.message
      });
    } finally {
      setProcessing(false);
    }
  };

  const advanceAmount = lease.montant_mensuel * (lease.advance_months_count || 2);
  const cautionAmount = lease.montant_mensuel * (lease.caution_months_count || 2);
  const agencyAmount = lease.montant_mensuel * (lease.agency_months_count || 1);

  return (
    <>
      <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Reçu de paiement à confirmer
              </CardTitle>
              <CardDescription>
                {lease.property_title} - {lease.property_address}
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-amber-500 text-amber-700">
              En attente de confirmation
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Détails du paiement */}
          <div className="p-4 bg-background rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Avance ({lease.advance_months_count || 2} mois)</span>
              <span className="font-medium">{advanceAmount.toLocaleString()} FCFA</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Caution ({lease.caution_months_count || 2} mois)</span>
              <span className="font-medium">{cautionAmount.toLocaleString()} FCFA</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Frais d'agence ({lease.agency_months_count || 1} mois)</span>
              <span className="font-medium">{agencyAmount.toLocaleString()} FCFA</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total</span>
              <span className="text-primary">{lease.caution_montant.toLocaleString()} FCFA</span>
            </div>
          </div>

          {/* Info reçu */}
          <div className="text-sm text-muted-foreground">
            <p>Reçu uploadé le {format(new Date(lease.receipt_uploaded_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setViewDialogOpen(true)} className="flex-1">
              <Eye className="h-4 w-4 mr-2" />
              Voir le reçu
            </Button>
            <Button onClick={() => setConfirmDialogOpen(true)} className="flex-1">
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirmer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialog visualisation reçu */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Reçu de paiement</DialogTitle>
            <DialogDescription>
              Vérifiez que ce reçu correspond bien à votre paiement
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-[400px] flex items-center justify-center bg-muted rounded-lg">
            {lease.receipt_url?.endsWith('.pdf') ? (
              <iframe src={lease.receipt_url} className="w-full h-[500px]" />
            ) : (
              <img src={lease.receipt_url} alt="Reçu de paiement" className="max-h-[500px] object-contain" />
            )}
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" asChild>
              <a href={lease.receipt_url} download target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4 mr-2" />
                Télécharger
              </a>
            </Button>
            <Button variant="destructive" onClick={() => {
              setViewDialogOpen(false);
              setDisputeDialogOpen(true);
            }}>
              <XCircle className="h-4 w-4 mr-2" />
              Contester
            </Button>
            <Button onClick={() => {
              setViewDialogOpen(false);
              setConfirmDialogOpen(true);
            }}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog confirmation */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la réception du paiement</DialogTitle>
            <DialogDescription>
              En confirmant, vous attestez avoir effectué le paiement de {lease.caution_montant.toLocaleString()} FCFA 
              et que le reçu correspond à votre transaction.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200">
                ✓ Le contrat de bail sera généré automatiquement<br/>
                ✓ Vous recevrez un reçu officiel de votre paiement<br/>
                ✓ La propriété sera marquée comme louée
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)} disabled={processing}>
              Annuler
            </Button>
            <Button onClick={handleConfirm} disabled={processing}>
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Confirmation...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Je confirme le paiement
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog contestation */}
      <Dialog open={disputeDialogOpen} onOpenChange={setDisputeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Contester le reçu
            </DialogTitle>
            <DialogDescription>
              Si le reçu ne correspond pas à votre paiement, le gestionnaire sera notifié pour vérification.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisputeDialogOpen(false)} disabled={processing}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDispute} disabled={processing}>
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Envoyer la contestation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
