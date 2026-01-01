import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Loader2, Save, Wallet, Users, UserCheck } from "lucide-react";
import { useDistributionConfig, useSaveDistributionConfig } from "@/hooks/usePaymentDistribution";
import { useAuth } from "@/hooks/useAuth";

interface PaymentDistributionConfigProps {
  spaceId: string;
}

const OPERATORS = [
  { value: 'orange_money', label: 'Orange Money' },
  { value: 'mtn_money', label: 'MTN Mobile Money' },
  { value: 'moov_money', label: 'Moov Money' },
  { value: 'wave', label: 'Wave' },
];

export const PaymentDistributionConfig = ({ spaceId }: PaymentDistributionConfigProps) => {
  const { user } = useAuth();
  const { data: config, isLoading } = useDistributionConfig(spaceId);
  const { mutate: saveConfig, isPending } = useSaveDistributionConfig();

  const [formData, setFormData] = useState({
    proprietaire_nom: '',
    proprietaire_telephone: '',
    proprietaire_operateur: 'orange_money',
    proprietaire_pourcentage: 90,
    gestionnaire_nom: '',
    gestionnaire_telephone: '',
    gestionnaire_operateur: 'orange_money',
    gestionnaire_pourcentage: 10,
    demarcheur_nom: '',
    demarcheur_telephone: '',
    demarcheur_operateur: 'orange_money',
  });

  useEffect(() => {
    if (config) {
      setFormData({
        proprietaire_nom: config.proprietaire_nom,
        proprietaire_telephone: config.proprietaire_telephone,
        proprietaire_operateur: config.proprietaire_operateur,
        proprietaire_pourcentage: config.proprietaire_pourcentage,
        gestionnaire_nom: config.gestionnaire_nom,
        gestionnaire_telephone: config.gestionnaire_telephone,
        gestionnaire_operateur: config.gestionnaire_operateur,
        gestionnaire_pourcentage: config.gestionnaire_pourcentage,
        demarcheur_nom: config.demarcheur_nom || '',
        demarcheur_telephone: config.demarcheur_telephone || '',
        demarcheur_operateur: config.demarcheur_operateur || 'orange_money',
      });
    }
  }, [config]);

  const handlePercentageChange = (value: number[]) => {
    const proprietairePct = value[0];
    setFormData(prev => ({
      ...prev,
      proprietaire_pourcentage: proprietairePct,
      gestionnaire_pourcentage: 100 - proprietairePct,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    saveConfig({
      space_id: spaceId,
      created_by: user.id,
      ...formData,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Configuration de la répartition des paiements
        </CardTitle>
        <CardDescription>
          Configurez les comptes mobile money pour la distribution automatique des paiements
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Répartition propriétaire/gestionnaire */}
          <div className="space-y-4">
            <Label>Répartition des loyers mensuels</Label>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground w-32">
                Propriétaire: {formData.proprietaire_pourcentage}%
              </span>
              <Slider
                value={[formData.proprietaire_pourcentage]}
                onValueChange={handlePercentageChange}
                max={100}
                min={0}
                step={5}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground w-32 text-right">
                Gestionnaire: {formData.gestionnaire_pourcentage}%
              </span>
            </div>
          </div>

          {/* Compte propriétaire */}
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center gap-2 font-medium">
              <Users className="h-4 w-4" />
              Compte Propriétaire ({formData.proprietaire_pourcentage}% des loyers)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Nom complet</Label>
                <Input
                  value={formData.proprietaire_nom}
                  onChange={(e) => setFormData(prev => ({ ...prev, proprietaire_nom: e.target.value }))}
                  placeholder="Nom du propriétaire"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Numéro de téléphone</Label>
                <Input
                  value={formData.proprietaire_telephone}
                  onChange={(e) => setFormData(prev => ({ ...prev, proprietaire_telephone: e.target.value }))}
                  placeholder="+225 07 XX XX XX XX"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Opérateur</Label>
                <Select
                  value={formData.proprietaire_operateur}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, proprietaire_operateur: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATORS.map(op => (
                      <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Compte gestionnaire */}
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center gap-2 font-medium">
              <UserCheck className="h-4 w-4" />
              Compte Gestionnaire ({formData.gestionnaire_pourcentage}% des loyers + garantie)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Nom complet</Label>
                <Input
                  value={formData.gestionnaire_nom}
                  onChange={(e) => setFormData(prev => ({ ...prev, gestionnaire_nom: e.target.value }))}
                  placeholder="Nom du gestionnaire"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Numéro de téléphone</Label>
                <Input
                  value={formData.gestionnaire_telephone}
                  onChange={(e) => setFormData(prev => ({ ...prev, gestionnaire_telephone: e.target.value }))}
                  placeholder="+225 07 XX XX XX XX"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Opérateur</Label>
                <Select
                  value={formData.gestionnaire_operateur}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, gestionnaire_operateur: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATORS.map(op => (
                      <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Compte démarcheur */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 font-medium">
              <Wallet className="h-4 w-4" />
              Compte Démarcheur (1 mois sur la caution - optionnel)
            </div>
            <p className="text-sm text-muted-foreground">
              Ce compte reçoit 1 mois de loyer lors du paiement de la caution (sur les 5 mois)
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Nom complet</Label>
                <Input
                  value={formData.demarcheur_nom}
                  onChange={(e) => setFormData(prev => ({ ...prev, demarcheur_nom: e.target.value }))}
                  placeholder="Nom du démarcheur (optionnel)"
                />
              </div>
              <div className="space-y-2">
                <Label>Numéro de téléphone</Label>
                <Input
                  value={formData.demarcheur_telephone}
                  onChange={(e) => setFormData(prev => ({ ...prev, demarcheur_telephone: e.target.value }))}
                  placeholder="+225 07 XX XX XX XX"
                />
              </div>
              <div className="space-y-2">
                <Label>Opérateur</Label>
                <Select
                  value={formData.demarcheur_operateur}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, demarcheur_operateur: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATORS.map(op => (
                      <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Enregistrer la configuration
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
