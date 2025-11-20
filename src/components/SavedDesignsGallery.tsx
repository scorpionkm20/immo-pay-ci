import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSavedDesigns, SavedDesign } from '@/hooks/useSavedDesigns';
import { Trash2, Edit2, ExternalLink, ImageIcon, Star, MessageSquare, Filter, SortAsc } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

export const SavedDesignsGallery = () => {
  const { designs, loading, deleteDesign, updateDesignName, updateDesignRating, updateDesignComments } = useSavedDesigns();
  const [editingDesign, setEditingDesign] = useState<SavedDesign | null>(null);
  const [newName, setNewName] = useState('');
  const [deletingDesign, setDeletingDesign] = useState<string | null>(null);
  const [ratingDesign, setRatingDesign] = useState<SavedDesign | null>(null);
  const [rating, setRating] = useState(0);
  const [commentingDesign, setCommentingDesign] = useState<SavedDesign | null>(null);
  const [comment, setComment] = useState('');
  const [filterStyle, setFilterStyle] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date-desc');
  const navigate = useNavigate();

  // Get unique styles for filter
  const uniqueStyles = useMemo(() => {
    const styles = designs.map(d => d.style_name);
    return Array.from(new Set(styles)).sort();
  }, [designs]);

  // Filter and sort designs
  const filteredAndSortedDesigns = useMemo(() => {
    let filtered = [...designs];

    // Apply style filter
    if (filterStyle !== 'all') {
      filtered = filtered.filter(d => d.style_name === filterStyle);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'date-asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'rating-desc':
          return (b.rating || 0) - (a.rating || 0);
        case 'rating-asc':
          return (a.rating || 0) - (b.rating || 0);
        case 'name-asc':
          return a.design_name.localeCompare(b.design_name);
        case 'name-desc':
          return b.design_name.localeCompare(a.design_name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [designs, filterStyle, sortBy]);

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

  const handleSaveRating = async () => {
    if (ratingDesign && rating > 0) {
      await updateDesignRating(ratingDesign.id, rating);
      setRatingDesign(null);
      setRating(0);
    }
  };

  const handleSaveComment = async () => {
    if (commentingDesign) {
      await updateDesignComments(commentingDesign.id, comment.trim());
      setCommentingDesign(null);
      setComment('');
    }
  };

  const handleLoadDesign = (design: SavedDesign) => {
    // Store the design in localStorage to load it in BedroomDesigner
    localStorage.setItem('loadedDesign', JSON.stringify(design));
    navigate('/bedroom-designer');
  };

  const handleDelete = async (id: string) => {
    await deleteDesign(id);
    setDeletingDesign(null);
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
        <CardDescription>
          {filteredAndSortedDesigns.length} design{filteredAndSortedDesigns.length > 1 ? 's' : ''} 
          {filterStyle !== 'all' && ` (${filterStyle})`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters and Sort */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Label className="text-sm font-medium mb-2 flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtrer par style
            </Label>
            <Select value={filterStyle} onValueChange={setFilterStyle}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les styles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les styles</SelectItem>
                {uniqueStyles.map(style => (
                  <SelectItem key={style} value={style}>{style}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1">
            <Label className="text-sm font-medium mb-2 flex items-center gap-2">
              <SortAsc className="h-4 w-4" />
              Trier par
            </Label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Plus récent</SelectItem>
                <SelectItem value="date-asc">Plus ancien</SelectItem>
                <SelectItem value="rating-desc">Meilleure note</SelectItem>
                <SelectItem value="rating-asc">Note la plus basse</SelectItem>
                <SelectItem value="name-asc">Nom (A-Z)</SelectItem>
                <SelectItem value="name-desc">Nom (Z-A)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <ScrollArea className="h-[600px] pr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAndSortedDesigns.map((design) => (
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
                  {design.rating && (
                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-background/80 backdrop-blur-sm px-2 py-1 rounded-full">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{design.rating}</span>
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2 line-clamp-1">{design.design_name}</h3>
                  {design.comments && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{design.comments}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(design.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </CardContent>
                <div className="border-t p-3 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleLoadDesign(design)}
                    className="flex-1"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Charger
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRatingDesign(design);
                      setRating(design.rating || 0);
                    }}
                    title="Noter"
                  >
                    <Star className={`h-4 w-4 ${design.rating ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCommentingDesign(design);
                      setComment(design.comments || '');
                    }}
                    title="Commenter"
                  >
                    <MessageSquare className={`h-4 w-4 ${design.comments ? 'fill-primary' : ''}`} />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(design)}
                    title="Renommer"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeletingDesign(design.id)}
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>

        {filteredAndSortedDesigns.length === 0 && designs.length > 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Aucun design ne correspond aux filtres sélectionnés</p>
            <Button 
              variant="outline" 
              onClick={() => {
                setFilterStyle('all');
                setSortBy('date-desc');
              }}
              className="mt-4"
            >
              Réinitialiser les filtres
            </Button>
          </div>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={!!editingDesign} onOpenChange={(open) => !open && setEditingDesign(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renommer le design</DialogTitle>
            <DialogDescription>Donnez un nouveau nom à votre design</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="design-name">Nom du design</Label>
              <Input
                id="design-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nom du design"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDesign(null)}>
              Annuler
            </Button>
            <Button onClick={handleSaveEdit}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rating Dialog */}
      <Dialog open={!!ratingDesign} onOpenChange={(open) => !open && setRatingDesign(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Noter le design</DialogTitle>
            <DialogDescription>Donnez une note de 1 à 5 étoiles</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  onClick={() => setRating(value)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-10 w-10 ${
                      value <= rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {rating > 0 ? `${rating} étoile${rating > 1 ? 's' : ''}` : 'Cliquez pour noter'}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRatingDesign(null)}>
              Annuler
            </Button>
            <Button onClick={handleSaveRating} disabled={rating === 0}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comment Dialog */}
      <Dialog open={!!commentingDesign} onOpenChange={(open) => !open && setCommentingDesign(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Commenter le design</DialogTitle>
            <DialogDescription>Ajoutez vos commentaires et remarques</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="comment">Commentaire</Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Vos commentaires..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCommentingDesign(null)}>
              Annuler
            </Button>
            <Button onClick={handleSaveComment}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingDesign} onOpenChange={(open) => !open && setDeletingDesign(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le design sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingDesign && handleDelete(deletingDesign)}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
