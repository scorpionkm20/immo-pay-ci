import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { Trash2, Edit2, ExternalLink, ImageIcon, Star, MessageSquare } from 'lucide-react';
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
      </CardContent>
    </Card>
  );
};
