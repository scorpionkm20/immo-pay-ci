import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useManagementSpaces } from '@/hooks/useManagementSpaces';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PropertyImageManager } from '@/components/PropertyImageManager';
import { ArrowLeft, Building2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const propertySchema = z.object({
  titre: z.string().trim().min(5, "Le titre doit contenir au moins 5 caractères").max(100),
  description: z.string().trim().min(20, "La description doit contenir au moins 20 caractères").max(1000),
  adresse: z.string().trim().min(5, "L'adresse est requise").max(200),
  ville: z.string().trim().min(2, "La ville est requise"),
  quartier: z.string().optional(),
  prix_mensuel: z.number().min(1000, "Le prix doit être supérieur à 1000 FCFA"),
  caution: z.number().min(0, "La caution ne peut pas être négative"),
  nombre_pieces: z.number().min(1, "Au moins 1 pièce").max(50),
  surface_m2: z.number().optional(),
  type_propriete: z.string().min(1, "Le type est requis"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

const EditProperty = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { spaces, loading: spacesLoading } = useManagementSpaces();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [images, setImages] = useState<string[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('');
  const [originalSpaceId, setOriginalSpaceId] = useState<string>('');
  const [pendingSpaceId, setPendingSpaceId] = useState<string>('');
  const [showSpaceChangeConfirm, setShowSpaceChangeConfirm] = useState(false);

  const [formData, setFormData] = useState({
    titre: '',
    description: '',
    adresse: '',
    ville: '',
    quartier: '',
    prix_mensuel: '',
    caution: '',
    nombre_pieces: '',
    surface_m2: '',
    type_propriete: 'appartement',
    latitude: '',
    longitude: '',
  });

  useEffect(() => {
    if (!user || userRole !== 'gestionnaire') {
      navigate('/');
      return;
    }
    fetchProperty();
  }, [user, userRole, id]);

  const fetchProperty = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .eq('gestionnaire_id', user!.id)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          titre: data.titre || '',
          description: data.description || '',
          adresse: data.adresse || '',
          ville: data.ville || '',
          quartier: data.quartier || '',
          prix_mensuel: data.prix_mensuel?.toString() || '',
          caution: data.caution?.toString() || '',
          nombre_pieces: data.nombre_pieces?.toString() || '',
          surface_m2: data.surface_m2?.toString() || '',
          type_propriete: data.type_propriete || 'appartement',
          latitude: data.latitude?.toString() || '',
          longitude: data.longitude?.toString() || '',
        });
        setImages(data.images || []);
        setSelectedSpaceId(data.space_id || '');
        setOriginalSpaceId(data.space_id || '');
      }
    } catch (error: any) {
      console.error('Error fetching property:', error);
      toast.error('Erreur lors du chargement de la propriété');
      navigate('/my-properties');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const dataToValidate = {
      ...formData,
      prix_mensuel: parseFloat(formData.prix_mensuel) || 0,
      caution: parseFloat(formData.caution) || 0,
      nombre_pieces: parseInt(formData.nombre_pieces) || 0,
      surface_m2: formData.surface_m2 ? parseFloat(formData.surface_m2) : undefined,
      latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
      longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
    };

    const result = propertySchema.safeParse(dataToValidate);

    if (!result.success) {
      const newErrors: any = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) newErrors[err.path[0]] = err.message;
      });
      setErrors(newErrors);
      return;
    }

    if (images.length === 0) {
      toast.error('Au moins une image est requise');
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('properties')
        .update({
          ...result.data,
          images,
          space_id: selectedSpaceId,
          date_mise_a_jour: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Propriété mise à jour avec succès');
      navigate('/my-properties');
    } catch (error: any) {
      console.error('Error updating property:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const handleSpaceChange = (newSpaceId: string) => {
    if (newSpaceId !== originalSpaceId && originalSpaceId) {
      setPendingSpaceId(newSpaceId);
      setShowSpaceChangeConfirm(true);
    } else {
      setSelectedSpaceId(newSpaceId);
    }
  };

  const confirmSpaceChange = () => {
    setSelectedSpaceId(pendingSpaceId);
    setShowSpaceChangeConfirm(false);
    setPendingSpaceId('');
  };

  const cancelSpaceChange = () => {
    setShowSpaceChangeConfirm(false);
    setPendingSpaceId('');
  };

  const getSpaceName = (spaceId: string) => {
    return spaces.find(s => s.id === spaceId)?.nom || 'Inconnu';
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-4xl mx-auto px-4">
        <Button variant="ghost" onClick={() => navigate('/my-properties')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à mes propriétés
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Modifier la propriété</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Space Selector */}
              <div className="space-y-2">
                <Label htmlFor="space" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Espace de gestion
                </Label>
                {spacesLoading ? (
                  <div className="h-10 bg-muted animate-pulse rounded-md" />
                ) : (
                  <Select
                    value={selectedSpaceId}
                    onValueChange={handleSpaceChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un espace" />
                    </SelectTrigger>
                    <SelectContent>
                      {spaces.map((space) => (
                        <SelectItem key={space.id} value={space.id}>
                          {space.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {selectedSpaceId !== originalSpaceId && originalSpaceId && (
                  <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      Cette propriété sera déplacée vers un nouvel espace
                    </p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Déplacez cette propriété vers un autre espace si nécessaire
                </p>
              </div>

              {/* Images Manager */}
              <div className="space-y-2">
                <Label>Images de la propriété (max 10)</Label>
                <PropertyImageManager
                  propertyId={id}
                  initialImages={images}
                  onImagesChange={setImages}
                  maxImages={10}
                />
              </div>

              {/* Basic Info */}
              <div className="space-y-2">
                <Label htmlFor="titre">Titre de l'annonce *</Label>
                <Input
                  id="titre"
                  value={formData.titre}
                  onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                  placeholder="Ex: Appartement 3 pièces à Cocody"
                />
                {errors.titre && <p className="text-sm text-destructive">{errors.titre}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Décrivez la propriété..."
                  rows={4}
                />
                {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
              </div>

              {/* Location */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ville">Ville *</Label>
                  <Input
                    id="ville"
                    value={formData.ville}
                    onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                    placeholder="Abidjan"
                  />
                  {errors.ville && <p className="text-sm text-destructive">{errors.ville}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quartier">Quartier</Label>
                  <Input
                    id="quartier"
                    value={formData.quartier}
                    onChange={(e) => setFormData({ ...formData, quartier: e.target.value })}
                    placeholder="Cocody"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adresse">Adresse complète *</Label>
                <Input
                  id="adresse"
                  value={formData.adresse}
                  onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                  placeholder="Rue, numéro..."
                />
                {errors.adresse && <p className="text-sm text-destructive">{errors.adresse}</p>}
              </div>

              {/* GPS Coordinates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitude (GPS)</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    placeholder="Ex: 5.359952"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitude (GPS)</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    placeholder="Ex: -4.008256"
                  />
                </div>
              </div>

              {/* Property Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type_propriete">Type *</Label>
                  <Select
                    value={formData.type_propriete}
                    onValueChange={(value) => setFormData({ ...formData, type_propriete: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="appartement">Appartement</SelectItem>
                      <SelectItem value="maison">Maison</SelectItem>
                      <SelectItem value="studio">Studio</SelectItem>
                      <SelectItem value="villa">Villa</SelectItem>
                      <SelectItem value="duplex">Duplex</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nombre_pieces">Nombre de pièces *</Label>
                  <Input
                    id="nombre_pieces"
                    type="number"
                    value={formData.nombre_pieces}
                    onChange={(e) => setFormData({ ...formData, nombre_pieces: e.target.value })}
                  />
                  {errors.nombre_pieces && <p className="text-sm text-destructive">{errors.nombre_pieces}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="surface_m2">Surface (m²)</Label>
                <Input
                  id="surface_m2"
                  type="number"
                  value={formData.surface_m2}
                  onChange={(e) => setFormData({ ...formData, surface_m2: e.target.value })}
                />
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prix_mensuel">Loyer mensuel (FCFA) *</Label>
                  <Input
                    id="prix_mensuel"
                    type="number"
                    value={formData.prix_mensuel}
                    onChange={(e) => setFormData({ ...formData, prix_mensuel: e.target.value })}
                  />
                  {errors.prix_mensuel && <p className="text-sm text-destructive">{errors.prix_mensuel}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="caution">Caution (FCFA) *</Label>
                  <Input
                    id="caution"
                    type="number"
                    value={formData.caution}
                    onChange={(e) => setFormData({ ...formData, caution: e.target.value })}
                  />
                  {errors.caution && <p className="text-sm text-destructive">{errors.caution}</p>}
                </div>
              </div>

              <div className="flex gap-4">
                <Button type="submit" className="flex-1" disabled={saving}>
                  {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/my-properties')}
                >
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Space Change Confirmation Dialog */}
      <AlertDialog open={showSpaceChangeConfirm} onOpenChange={setShowSpaceChangeConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirmer le déplacement
            </AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de déplacer cette propriété de l'espace{' '}
              <strong>"{getSpaceName(originalSpaceId)}"</strong> vers{' '}
              <strong>"{getSpaceName(pendingSpaceId)}"</strong>.
              <br /><br />
              Cette action modifiera l'accès à cette propriété pour les membres des différents espaces.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelSpaceChange}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSpaceChange}>
              Confirmer le déplacement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EditProperty;
