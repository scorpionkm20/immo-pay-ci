import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload } from 'lucide-react';

interface DocumentUploadProps {
  leaseId: string;
  onUpload: (leaseId: string, file: File, titre: string, typeDocument: string) => Promise<any>;
  onCancel: () => void;
}

export const DocumentUpload = ({ leaseId, onUpload, onCancel }: DocumentUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [titre, setTitre] = useState('');
  const [typeDocument, setTypeDocument] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !titre || !typeDocument) return;

    setUploading(true);
    await onUpload(leaseId, file, titre, typeDocument);
    setUploading(false);
    
    // Reset form
    setFile(null);
    setTitre('');
    setTypeDocument('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ajouter un document</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="titre">Titre du document</Label>
            <Input
              id="titre"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Ex: Contrat de bail"
              required
            />
          </div>

          <div>
            <Label htmlFor="type">Type de document</Label>
            <Select value={typeDocument} onValueChange={setTypeDocument} required>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez un type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bail">Bail</SelectItem>
                <SelectItem value="quittance">Quittance</SelectItem>
                <SelectItem value="etat_lieux">État des lieux</SelectItem>
                <SelectItem value="autre">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="file">Fichier</Label>
            <div className="mt-2">
              <Input
                id="file"
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Formats acceptés: PDF, Word, Images (max 20 MB)
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" disabled={uploading || !file || !titre || !typeDocument} className="flex-1">
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Upload en cours...' : 'Télécharger'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
