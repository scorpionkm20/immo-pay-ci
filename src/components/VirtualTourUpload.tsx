import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Video, Orbit } from 'lucide-react';

interface VirtualTourUploadProps {
  propertyId: string;
  onUpload: (propertyId: string, file: File, titre: string, description: string, type: 'video' | 'photo_360') => Promise<void>;
  onCancel: () => void;
}

export const VirtualTourUpload = ({ propertyId, onUpload, onCancel }: VirtualTourUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'video' | 'photo_360'>('photo_360');
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !titre) return;

    setUploading(true);
    await onUpload(propertyId, file, titre, description, type);
    setUploading(false);
    
    // Reset form
    setFile(null);
    setTitre('');
    setDescription('');
    setType('photo_360');
  };

  const acceptedFiles = type === 'video' 
    ? 'video/mp4,video/webm' 
    : 'image/jpeg,image/png,image/webp';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {type === 'video' ? <Video className="h-5 w-5" /> : <Orbit className="h-5 w-5" />}
          Ajouter une visite virtuelle
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="type">Type de média</Label>
            <Select value={type} onValueChange={(val: 'video' | 'photo_360') => setType(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez un type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="photo_360">Photo 360°</SelectItem>
                <SelectItem value="video">Vidéo 360°</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="titre">Titre</Label>
            <Input
              id="titre"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Ex: Visite du salon"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description (optionnelle)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez cette visite virtuelle..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="file">
              Fichier {type === 'video' ? 'vidéo' : 'photo'} 360°
            </Label>
            <div className="mt-2">
              <Input
                id="file"
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                accept={acceptedFiles}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                {type === 'video' 
                  ? 'Format: MP4 ou WebM (max 500 MB)' 
                  : 'Format: JPEG, PNG ou WebP. Photo panoramique 360° (max 500 MB)'}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={uploading || !file || !titre} 
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Upload en cours...' : 'Télécharger'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
