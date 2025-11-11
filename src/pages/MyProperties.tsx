import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProperties, Property } from '@/hooks/useProperties';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import AssignLeaseDialog from '@/components/AssignLeaseDialog';
import { ArrowLeft, Plus, Trash2, UserPlus, Eye } from 'lucide-react';

const MyProperties = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { properties, loading, deleteProperty } = useProperties();
  const [myProperties, setMyProperties] = useState<Property[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assignLeaseOpen, setAssignLeaseOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  useEffect(() => {
    if (!user || userRole !== 'gestionnaire') {
      navigate('/');
      return;
    }

    // Filter properties managed by current user
    const filtered = properties.filter(p => p.gestionnaire_id === user.id);
    setMyProperties(filtered);
  }, [properties, user, userRole, navigate]);

  const handleDelete = async () => {
    if (selectedProperty) {
      await deleteProperty(selectedProperty.id);
      setDeleteDialogOpen(false);
      setSelectedProperty(null);
    }
  };

  const handleAssignLease = (property: Property) => {
    setSelectedProperty(property);
    setAssignLeaseOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'disponible':
        return <Badge className="bg-green-600">Disponible</Badge>;
      case 'loue':
        return <Badge variant="secondary">Loué</Badge>;
      case 'en_attente_validation':
        return <Badge variant="outline">En attente</Badge>;
      case 'indisponible':
        return <Badge variant="destructive">Indisponible</Badge>;
    }
  };

  const disponibles = myProperties.filter(p => p.statut === 'disponible');
  const loues = myProperties.filter(p => p.statut === 'loue');

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <Button variant="ghost" onClick={() => navigate('/')} className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <h1 className="text-4xl font-bold">Mes Propriétés</h1>
            <p className="text-muted-foreground">
              {myProperties.length} propriétés au total
            </p>
          </div>
          <Button onClick={() => navigate('/properties/create')}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle propriété
          </Button>
        </div>

        <Tabs defaultValue="disponibles" className="space-y-6">
          <TabsList>
            <TabsTrigger value="disponibles">
              Disponibles ({disponibles.length})
            </TabsTrigger>
            <TabsTrigger value="loues">
              Louées ({loues.length})
            </TabsTrigger>
            <TabsTrigger value="toutes">
              Toutes ({myProperties.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="disponibles" className="space-y-4">
            {disponibles.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <p className="text-muted-foreground">Aucune propriété disponible</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {disponibles.map((property) => (
                  <Card key={property.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-xl">{property.titre}</CardTitle>
                          <CardDescription className="mt-1">
                            {property.ville} • {property.nombre_pieces} pièces • {property.prix_mensuel.toLocaleString()} FCFA/mois
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(property.statut)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleAssignLease(property)}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Attribuer
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/properties/${property.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Voir
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setSelectedProperty(property);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="loues" className="space-y-4">
            {loues.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <p className="text-muted-foreground">Aucune propriété louée</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {loues.map((property) => (
                  <Card key={property.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-xl">{property.titre}</CardTitle>
                          <CardDescription className="mt-1">
                            {property.ville} • {property.nombre_pieces} pièces • {property.prix_mensuel.toLocaleString()} FCFA/mois
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(property.statut)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/properties/${property.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Voir détails
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="toutes" className="space-y-4">
            <div className="grid gap-4">
              {myProperties.map((property) => (
                <Card key={property.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-xl">{property.titre}</CardTitle>
                        <CardDescription className="mt-1">
                          {property.ville} • {property.nombre_pieces} pièces • {property.prix_mensuel.toLocaleString()} FCFA/mois
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(property.statut)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      {property.statut === 'disponible' && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleAssignLease(property)}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Attribuer
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/properties/${property.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Voir
                      </Button>
                      {property.statut === 'disponible' && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setSelectedProperty(property);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette propriété ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assign Lease Dialog */}
      <AssignLeaseDialog
        open={assignLeaseOpen}
        onOpenChange={setAssignLeaseOpen}
        property={selectedProperty}
      />
    </div>
  );
};

export default MyProperties;
