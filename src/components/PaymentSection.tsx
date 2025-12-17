import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { usePayments } from '@/hooks/usePayments';
import { CreditCard, Smartphone, AlertCircle, CheckCircle, X, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';

interface PaymentSectionProps {
  leaseId: string;
  montant: number;
  moisPaiement: string;
  isCaution?: boolean;
  propertyTitle?: string;
  onSuccess?: () => void;
  onClose?: () => void;
}

export const PaymentSection = ({
  leaseId,
  montant,
  moisPaiement,
  isCaution = false,
  propertyTitle,
  onSuccess,
  onClose
}: PaymentSectionProps) => {
  const { createPayment } = usePayments();
  const [loading, setLoading] = useState(false);
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState<{ message: string; code?: string } | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  
  const [formData, setFormData] = useState({
    methode_paiement: 'mobile_money',
    numero_telephone: ''
  });

  const handlePayment = async () => {
    if (!formData.numero_telephone) {
      return;
    }

    setLoading(true);
    setPaymentError(null);
    
    try {
      const { data, error } = await createPayment({
        lease_id: leaseId,
        montant,
        mois_paiement: moisPaiement,
        methode_paiement: formData.methode_paiement,
        numero_telephone: formData.numero_telephone
      });

      if (error) {
        setPaymentError(error);
        setRetryCount(prev => prev + 1);
      } else {
        if (data?.simulation_mode) {
          setIsSimulationMode(true);
        }
        setPaymentSuccess(true);
        setRetryCount(0); // Reset on success
        onSuccess?.();
      }
    } catch (err) {
      setPaymentError({ 
        message: err instanceof Error ? err.message : "Une erreur inattendue est survenue" 
      });
      setRetryCount(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  const canRetry = retryCount < MAX_RETRIES;

  if (paymentSuccess) {
    return (
      <Card className="border-green-500 bg-green-50 dark:bg-green-950/20">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
            <div>
              <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">
                Paiement {isSimulationMode ? 'simulé' : 'initié'} avec succès !
              </h3>
              <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                {isSimulationMode 
                  ? "Mode simulation : Le paiement a été validé automatiquement."
                  : "Suivez les instructions sur votre téléphone pour confirmer le paiement."
                }
              </p>
            </div>
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Fermer
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">
              {isCaution ? 'Paiement de la Caution' : 'Paiement du Loyer'}
            </CardTitle>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        {propertyTitle && (
          <CardDescription>{propertyTitle}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Montant */}
        <div className="p-4 bg-muted rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Montant à payer</span>
            <span className="text-2xl font-bold text-primary">{montant.toLocaleString()} FCFA</span>
          </div>
          {isCaution && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs font-medium text-foreground mb-2">Détails de la caution (5x loyer) :</p>
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>• 2 mois d'avance</span>
                  <span>{(montant / 5 * 2).toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between">
                  <span>• 2 mois de garantie</span>
                  <span>{(montant / 5 * 2).toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between">
                  <span>• 1 mois démarcheur</span>
                  <span>{(montant / 5).toLocaleString()} FCFA</span>
                </div>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-3">
                ⚠️ Après ce paiement, votre premier loyer sera dû dans 2 mois
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* Mode de paiement */}
        <div className="space-y-2">
          <Label>Mode de paiement</Label>
          <Select
            value={formData.methode_paiement}
            onValueChange={(value) => setFormData(prev => ({ ...prev, methode_paiement: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mobile_money">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Mobile Money
                </div>
              </SelectItem>
              <SelectItem value="wave">Wave</SelectItem>
              <SelectItem value="orange_money">Orange Money</SelectItem>
              <SelectItem value="moov_money">Moov Money</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Numéro de téléphone */}
        <div className="space-y-2">
          <Label htmlFor="phone">Numéro de téléphone</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="Ex: 0707070707"
            value={formData.numero_telephone}
            onChange={(e) => setFormData(prev => ({ ...prev, numero_telephone: e.target.value }))}
          />
        </div>

        {/* Alerte simulation */}
        <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-900 dark:text-amber-100">Information</AlertTitle>
          <AlertDescription className="text-amber-800 dark:text-amber-200 text-xs">
            Si le mode simulation est actif, le paiement sera validé automatiquement sans transaction réelle.
          </AlertDescription>
        </Alert>

        {/* Alerte erreur avec retry */}
        {paymentError && (
          <Alert className="border-destructive bg-destructive/10">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertTitle className="text-destructive">
              Échec du paiement {retryCount > 0 && `(tentative ${retryCount}/${MAX_RETRIES})`}
            </AlertTitle>
            <AlertDescription className="text-destructive/90 text-sm">
              <p className="mb-2">{paymentError.message}</p>
              {paymentError.code && (
                <p className="text-xs text-muted-foreground mb-2">Code: {paymentError.code}</p>
              )}
              {canRetry ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setPaymentError(null);
                    handlePayment();
                  }}
                  className="mt-1"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Réessayer ({MAX_RETRIES - retryCount} restants)
                </Button>
              ) : (
                <div className="mt-2 p-2 bg-muted rounded text-muted-foreground text-xs">
                  <p className="font-medium">Nombre maximum de tentatives atteint.</p>
                  <p>Veuillez contacter le support ou réessayer plus tard.</p>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Bouton de paiement */}
        <Button 
          onClick={handlePayment}
          className="w-full"
          size="lg"
          disabled={loading || !formData.numero_telephone}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Traitement...
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4 mr-2" />
              Payer {montant.toLocaleString()} FCFA
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
