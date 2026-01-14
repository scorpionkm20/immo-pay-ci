import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, FileImage, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ReceiptUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leaseId: string;
  propertyTitle: string;
  tenantName: string;
  totalAmount: number;
  onSuccess?: () => void;
}

export const ReceiptUploadDialog = ({
  open,
  onOpenChange,
  leaseId,
  propertyTitle,
  tenantName,
  totalAmount,
  onSuccess
}: ReceiptUploadDialogProps) => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      
      // Create preview for images
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        setPreview(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${leaseId}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('payment-receipts')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('payment-receipts')
        .getPublicUrl(fileName);

      // Update lease with receipt info
      const { error: updateError } = await supabase
        .from('leases')
        .update({
          receipt_url: publicUrl,
          receipt_uploaded_at: new Date().toISOString(),
          receipt_uploaded_by: user.id,
          payment_status: 'awaiting_tenant_confirmation'
        })
        .eq('id', leaseId);

      if (updateError) throw updateError;

      // Create notification for tenant
      const { data: lease } = await supabase
        .from('leases')
        .select('locataire_id')
        .eq('id', leaseId)
        .single();

      if (lease) {
        await supabase.from('notifications').insert({
          user_id: lease.locataire_id,
          lease_id: leaseId,
          type: 'receipt_uploaded',
          titre: 'Reçu de paiement disponible',
          message: `Le reçu de votre paiement pour ${propertyTitle} a été uploadé. Veuillez confirmer la réception.`
        });
      }

      toast({
        title: 'Reçu uploadé',
        description: 'Le locataire a été notifié pour confirmation.'
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.message
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Uploader le reçu de paiement
          </DialogTitle>
          <DialogDescription>
            Après réception du paiement en espèces, uploadez le reçu pour validation par le locataire.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Résumé */}
          <Card>
            <CardContent className="pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Propriété</span>
                <span className="font-medium">{propertyTitle}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Locataire</span>
                <span className="font-medium">{tenantName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Montant reçu</span>
                <span className="font-bold text-primary">{totalAmount.toLocaleString()} FCFA</span>
              </div>
            </CardContent>
          </Card>

          {/* Upload zone */}
          <div className="space-y-2">
            <Label>Reçu de paiement (image ou PDF) *</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
              <Input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="hidden"
                id="receipt-upload"
              />
              <label htmlFor="receipt-upload" className="cursor-pointer">
                {preview ? (
                  <img src={preview} alt="Aperçu" className="max-h-40 mx-auto rounded" />
                ) : file ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileImage className="h-8 w-8 text-primary" />
                    <span className="font-medium">{file.name}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Cliquez pour sélectionner ou déposez un fichier
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Images (JPG, PNG) ou PDF jusqu'à 20 MB
                    </p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Info */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Une fois uploadé, le locataire recevra une notification pour confirmer la réception du paiement.
              Après confirmation, le contrat de bail et le reçu officiel seront générés automatiquement.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Annuler
          </Button>
          <Button onClick={handleUpload} disabled={!file || uploading}>
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Upload en cours...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Uploader le reçu
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
