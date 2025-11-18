import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSavedDesigns, SavedDesign } from '@/hooks/useSavedDesigns';
import { Trash2, Edit2, ExternalLink, ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

export const SavedDesignsGallery = () => {
  const { designs, loading, deleteDesign, updateDesignName } = useSavedDesigns();
  const [editingDesign, setEditingDesign] = useState<SavedDesign | null>(null);
  const [newName, setNewName] = useState('');
  const navigate = useNavigate();

  const handleEdit = (design: SavedDesign) => {
    setEditingDesign(design);
    setNewName(design.design_name);
  };

  const handleSaveEdit = async () => {
    if (editingDesign && newName.trim()) {
      await updateDesignName(editingDesign.id, newName.trim());
      setEditingDesign(null);
      setNewName('');
    }
  };

  const handleLoadDesign = (design: SavedDesign) => {
    // Store the design in localStorage to load it in BedroomDesigner
    localStorage.setItem('loadedDesign', JSON.stringify(design));
    navigate('/bedroom-designer');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mes Designs Sauvegardés</CardTitle>
          <CardDescription>Chargement...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (designs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mes Designs Sauvegardés</CardTitle>
          <CardDescription>Vous n'avez pas encore de designs sauvegardés</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <ImageIcon className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">Créez votre premier design avec l'assistant IA</p>
          <Button onClick={() => navigate('/bedroom-designer')}>
            Commencer le Design
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mes Designs Sauvegardés</CardTitle>
        <CardDescription>{designs.length} design{designs.length > 1 ? 's' : ''} sauvegardé{designs.length > 1 ? 's' : ''}</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {designs.map((design) => (
              <Card key={design.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative aspect-video">
                  <img
                    src={design.designed_image_url}
                    alt={design.design_name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary">{design.style_name}</Badge>
                  </div>
                </div>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold truncate">{design.design_name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {new Date(design.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleLoadDesign(design)}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Charger
                    </Button>

                    <Dialog open={editingDesign?.id === design.id} onOpenChange={(open) => !open && setEditingDesign(null)}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(design)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Renommer le design</DialogTitle>
                          <DialogDescription>
                            Changez le nom de votre design
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="name">Nom du design</Label>
                            <Input
                              id="name"
                              value={newName}
                              onChange={(e) => setNewName(e.target.value)}
                              placeholder="Mon nouveau design"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setEditingDesign(null)}>
                            Annuler
                          </Button>
                          <Button onClick={handleSaveEdit}>
                            Sauvegarder
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                          <AlertDialogDescription>
                            Êtes-vous sûr de vouloir supprimer "{design.design_name}" ? Cette action est irréversible.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteDesign(design.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
