import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useContractTemplates } from '@/hooks/useContractTemplates';
import { FileText, Loader2, AlertTriangle } from 'lucide-react';

interface GenerateContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leaseId: string;
  spaceId: string;
  cautionPayee?: boolean;
  onSuccess?: () => void;
}

export const GenerateContractDialog = ({
  open,
  onOpenChange,
  leaseId,
  spaceId,
  cautionPayee = false,
  onSuccess,
}: GenerateContractDialogProps) => {
  const { templates, loading: templatesLoading, generateContract } = useContractTemplates(spaceId);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    const { error } = await generateContract(leaseId, selectedTemplate || undefined);
    setGenerating(false);
    
    if (!error) {
      onOpenChange(false);
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Générer un contrat de bail
          </DialogTitle>
          <DialogDescription>
            Sélectionnez un template pour générer automatiquement le contrat pré-rempli avec les
            données du bail
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!cautionPayee && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                La caution n'a pas encore été payée par le locataire. Le contrat de bail ne peut être 
                généré qu'après le paiement de la caution.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="template">Template de contrat</Label>
            {templatesLoading ? (
              <p className="text-sm text-muted-foreground">Chargement des templates...</p>
            ) : (
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate} disabled={!cautionPayee}>
                <SelectTrigger id="template">
                  <SelectValue placeholder="Sélectionner un template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.nom}
                      {template.is_default && ' (Par défaut)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="text-xs text-muted-foreground">
              Le template sera automatiquement rempli avec les informations de la propriété et du
              locataire
            </p>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <p className="text-sm font-medium">Le contrat inclura :</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>Informations complètes de la propriété</li>
              <li>Coordonnées du gestionnaire et du locataire</li>
              <li>Montant du loyer et de la caution</li>
              <li>Dates de début du bail</li>
              <li>Clauses légales standard</li>
            </ul>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generating}>
              Annuler
            </Button>
            <Button onClick={handleGenerate} disabled={generating || templatesLoading || !cautionPayee}>
              {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Générer le contrat PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
