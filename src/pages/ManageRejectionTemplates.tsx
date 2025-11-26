import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { useManagementSpaces } from '@/hooks/useManagementSpaces';
import { useRejectionTemplates } from '@/hooks/useRejectionTemplates';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const ManageRejectionTemplates = () => {
  const { userRole } = useAuth();
  const { currentSpace } = useManagementSpaces();
  const { templates, loading, createTemplate, updateTemplate, deleteTemplate } = useRejectionTemplates(currentSpace?.id);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [formData, setFormData] = useState({ nom: '', message: '', is_default: false });
  const [submitting, setSubmitting] = useState(false);

  if (userRole !== 'gestionnaire' && userRole !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async () => {
    setSubmitting(true);
    
    if (editingTemplate) {
      await updateTemplate(editingTemplate, formData);
    } else {
      await createTemplate(formData);
    }
    
    setSubmitting(false);
    setDialogOpen(false);
    resetForm();
  };

  const handleEdit = (template: any) => {
    setEditingTemplate(template.id);
    setFormData({
      nom: template.nom,
      message: template.message,
      is_default: template.is_default
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce modèle ?')) {
      await deleteTemplate(id);
    }
  };

  const resetForm = () => {
    setEditingTemplate(null);
    setFormData({ nom: '', message: '', is_default: false });
  };

  const handleOpenDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">Chargement...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Modèles de réponse</h1>
            <p className="text-muted-foreground">
              Gérez vos modèles de réponse pour les rejets de demandes
            </p>
          </div>
          <Button onClick={handleOpenDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau modèle
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {template.nom}
                      {template.is_default && (
                        <Badge variant="secondary" className="gap-1">
                          <Star className="h-3 w-3" />
                          Par défaut
                        </Badge>
                      )}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {template.message}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(template)}
                    className="flex-1"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Modifier
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(template.id)}
                    className="flex-1"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {templates.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <p className="text-lg font-medium">Aucun modèle de réponse</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Créez votre premier modèle pour gagner du temps
                </p>
                <Button onClick={handleOpenDialog} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Créer un modèle
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Modifier le modèle' : 'Nouveau modèle de réponse'}
              </DialogTitle>
              <DialogDescription>
                Créez un modèle pour répondre rapidement aux demandes rejetées
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nom">Nom du modèle *</Label>
                <Input
                  id="nom"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  placeholder="Ex: Dossier incomplet"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Le message qui sera envoyé au locataire..."
                  rows={5}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={!formData.nom || !formData.message || submitting}
              >
                {submitting ? 'Enregistrement...' : editingTemplate ? 'Modifier' : 'Créer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default ManageRejectionTemplates;
