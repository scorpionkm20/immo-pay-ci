import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLeases } from '@/hooks/useLeases';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Property } from '@/hooks/useProperties';
import { Calculator, Calendar, AlertTriangle } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

interface LeaseAttributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: Property | null;
  tenantId?: string;
  proposedStartDate?: string;
  onSuccess?: () => void;
}

interface Locataire {
  user_id: string;
  full_name: string;
  phone: string;
}

const LeaseAttributionDialog = ({ 
  open, 
  onOpenChange, 
  property, 
  tenantId,
  proposedStartDate,
  onSuccess
}: LeaseAttributionDialogProps) => {
  const { user } = useAuth();
  const { createLease } = useLeases();
  const [loading, setLoading] = useState(false);
  const [locataires, setLocataires] = useState<Locataire[]>([]);
  
  const [formData, setFormData] = useState({
    locataire_id: tenantId || '',
    date_debut: proposedStartDate || '',
    advance_months: '2', // 2 ou 3 mois
    caution_months: '2', // 1 ou 2 mois
    agency_months: '1'   // 1 mois démarcheur
  });

  // Calculs dynamiques
  const advanceMonths = parseInt(formData.advance_months);
  const cautionMonths = parseInt(formData.caution_months);
  const agencyMonths = parseInt(formData.agency_months);
  const totalMonths = advanceMonths + cautionMonths + agencyMonths;
  
  const monthlyRent = property?.prix_mensuel || 0;
  const advanceAmount = monthlyRent * advanceMonths;
  const cautionAmount = monthlyRent * cautionMonths;
  const agencyAmount = monthlyRent * agencyMonths;
  const totalAmount = monthlyRent * totalMonths;

  // Date de début du paiement régulier
  const firstPaymentDate = formData.date_debut 
    ? addMonths(new Date(formData.date_debut), advanceMonths)
    : null;

  useEffect(() => {
    if (open && !tenantId) {
      fetchLocataires();
    }
  }, [open, tenantId]);

  useEffect(() => {
    if (tenantId) {
      setFormData(prev => ({ ...prev, locataire_id: tenantId }));
    }
    if (proposedStartDate) {
      setFormData(prev => ({ ...prev, date_debut: proposedStartDate }));
    }
  }, [tenantId, proposedStartDate]);

  const fetchLocataires = async () => {
    const { data, error } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        profiles!inner (
          full_name,
          phone
        )
      `)
      .eq('role', 'locataire');

    if (data && !error) {
      const locatairesData = data.map(item => ({
        user_id: item.user_id,
        full_name: (item.profiles as any).full_name,
        phone: (item.profiles as any).phone || ''
      }));
      setLocataires(locatairesData);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property || !user || !formData.locataire_id || !formData.date_debut) return;

    setLoading(true);

    try {
      // Get space_id from property
      const { data: propertyData } = await supabase
        .from('properties')
        .select('space_id')
        .eq('id', property.id)
        .single();

      const { error } = await supabase
        .from('leases')
        .insert({
          property_id: property.id,
          locataire_id: formData.locataire_id,
          gestionnaire_id: user.id,
          space_id: propertyData?.space_id,
          date_debut: formData.date_debut,
          montant_mensuel: monthlyRent,
          caution_montant: totalAmount,
          caution_payee: false,
          statut: 'en_attente_caution',
          payment_status: 'pending',
          advance_months_count: advanceMonths,
          caution_months_count: cautionMonths,
          agency_months_count: agencyMonths,
          first_regular_payment_date: firstPaymentDate?.toISOString().split('T')[0]
        });

      if (error) throw error;

      // Update property status
      await supabase
        .from('properties')
        .update({ statut: 'en_attente_validation' })
        .eq('id', property.id);

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating lease:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Attribution du Bail - Modèle Côte d'Ivoire
          </DialogTitle>
          <DialogDescription>
            Configurez les termes du bail selon les pratiques ivoiriennes
          </DialogDescription>
        </DialogHeader>

        {property && (
          <div className="mb-4 p-4 bg-muted rounded-lg">
            <p className="font-semibold">{property.titre}</p>
            <p className="text-sm text-muted-foreground">{property.adresse}, {property.ville}</p>
            <p className="text-lg font-bold text-primary mt-2">
              Loyer: {monthlyRent.toLocaleString()} FCFA/mois
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Sélection du locataire */}
          {!tenantId && (
            <div className="space-y-2">
              <Label htmlFor="locataire">Locataire *</Label>
              <Select
                value={formData.locataire_id}
                onValueChange={(value) => setFormData({ ...formData, locataire_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un locataire" />
                </SelectTrigger>
                <SelectContent>
                  {locataires.map((locataire) => (
                    <SelectItem key={locataire.user_id} value={locataire.user_id}>
                      {locataire.full_name} {locataire.phone && `(${locataire.phone})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date d'entrée */}
          <div className="space-y-2">
            <Label htmlFor="date_debut">Date d'entrée *</Label>
            <Input
              id="date_debut"
              type="date"
              value={formData.date_debut}
              onChange={(e) => setFormData({ ...formData, date_debut: e.target.value })}
              required
            />
          </div>

          {/* Configuration des mois */}
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Mois d'avance</Label>
                  <Select
                    value={formData.advance_months}
                    onValueChange={(value) => setFormData({ ...formData, advance_months: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 mois</SelectItem>
                      <SelectItem value="3">3 mois</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Mois de caution</Label>
                  <Select
                    value={formData.caution_months}
                    onValueChange={(value) => setFormData({ ...formData, caution_months: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 mois</SelectItem>
                      <SelectItem value="2">2 mois</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Mois agence</Label>
                  <Select
                    value={formData.agency_months}
                    onValueChange={(value) => setFormData({ ...formData, agency_months: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 mois</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Récapitulatif des montants */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Avance ({advanceMonths} mois)</span>
                  <span className="font-medium">{advanceAmount.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Caution ({cautionMonths} mois)</span>
                  <span className="font-medium">{cautionAmount.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Frais d'agence ({agencyMonths} mois)</span>
                  <span className="font-medium">{agencyAmount.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total à payer</span>
                  <span className="text-primary">{totalAmount.toLocaleString()} FCFA</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Information sur la date du premier loyer */}
          {firstPaymentDate && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start gap-2">
                <Calendar className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-900 dark:text-amber-100">
                    Date du premier loyer régulier
                  </p>
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    {format(firstPaymentDate, 'dd MMMM yyyy', { locale: fr })}
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    ({advanceMonths} mois d'avance inclus dans le paiement initial)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Workflow de validation */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium text-sm mb-2">Processus de validation :</p>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Le locataire paie en espèces/mobile money</li>
              <li>Vous uploadez le reçu de paiement</li>
              <li>Le locataire confirme la réception</li>
              <li>Le contrat et reçu sont générés automatiquement</li>
            </ol>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading || !formData.locataire_id || !formData.date_debut}>
              {loading ? 'Création...' : 'Créer le bail'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LeaseAttributionDialog;
