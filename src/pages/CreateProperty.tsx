import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProperties } from '@/hooks/useProperties';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { z } from 'zod';
import { ArrowLeft, Upload, X } from 'lucide-react';

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
  type_propriete: z.string().min(1, "Le type est requis")
});

const CreateProperty = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { createProperty, uploadPropertyImage } = useProperties();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

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
    equipements: [] as string[]
  });

  useEffect(() => {
    if (!user || userRole !== 'gestionnaire') {
      navigate('/');
    }
  }, [user, userRole, navigate]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedFiles.length > 5) {
      alert('Maximum 5 images autorisées');
      return;
    }

    setSelectedFiles([...selectedFiles, ...files]);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrls(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const dataToValidate = {
      ...formData,
      prix_mensuel: parseFloat(formData.prix_mensuel) || 0,
      caution: parseFloat(formData.caution) || 0,
      nombre_pieces: parseInt(formData.nombre_pieces) || 0,
      surface_m2: formData.surface_m2 ? parseFloat(formData.surface_m2) : undefined
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

    if (selectedFiles.length === 0) {
      setErrors({ images: "Au moins une image est requise" });
      return;
    }

    setLoading(true);

    // Create property first
    const { data: property, error: createError } = await createProperty({
      ...result.data,
      gestionnaire_id: user!.id,
      images: [],
      equipements: formData.equipements
    });

    if (createError || !property) {
      setLoading(false);
      return;
    }

    // Upload images
    const imageUrls: string[] = [];
    for (const file of selectedFiles) {
      const { data: url, error: uploadError } = await uploadPropertyImage(file, property.id);
      if (url) imageUrls.push(url);
    }

    // Update property with image URLs
    if (imageUrls.length > 0) {
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/properties?id=eq.${property.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
        },
        body: JSON.stringify({ images: imageUrls })
      });
    }

    setLoading(false);
    navigate('/properties');
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-3xl mx-auto px-4">
        <Button variant="ghost" onClick={() => navigate('/properties')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour aux annonces
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Nouvelle Annonce</CardTitle>
            <CardDescription>Publiez une nouvelle propriété</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Images */}
              <div className="space-y-2">
                <Label>Images (max 5)</Label>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {previewUrls.map((url, index) => (
                    <div key={index} className="relative">
                      <img src={url} alt={`Preview ${index}`} className="w-full h-32 object-cover rounded" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={() => removeImage(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                  <Label htmlFor="images" className="cursor-pointer">
                    <span className="text-primary hover:underline">Cliquez pour ajouter des images</span>
                    <Input
                      id="images"
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </Label>
                </div>
                {errors.images && <p className="text-sm text-destructive">{errors.images}</p>}
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

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Publication...' : 'Publier l\'annonce'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateProperty;
