import { useState } from 'react';
import { usePropertyFavorites } from '@/hooks/usePropertyFavorites';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Heart, 
  MapPin, 
  Home, 
  Maximize2, 
  TrendingDown,
  FileText,
  Grid3x3,
  LayoutList
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { FavoriteButton } from '@/components/FavoriteButton';
import PropertyCard from '@/components/PropertyCard';

const Favorites = () => {
  const { favorites, loading, updateNotes } = usePropertyFavorites();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedForComparison, setSelectedForComparison] = useState<Set<string>>(new Set());
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState('');

  const toggleComparison = (favoriteId: string) => {
    const newSelected = new Set(selectedForComparison);
    if (newSelected.has(favoriteId)) {
      newSelected.delete(favoriteId);
    } else {
      if (newSelected.size < 4) {
        newSelected.add(favoriteId);
      }
    }
    setSelectedForComparison(newSelected);
  };

  const startEditNotes = (favorite: any) => {
    setEditingNotes(favorite.id);
    setNotesValue(favorite.notes || '');
  };

  const saveNotes = async (favoriteId: string) => {
    await updateNotes(favoriteId, notesValue);
    setEditingNotes(null);
  };

  const hasPriceDrop = (favorite: any) => {
    return favorite.property && favorite.property.prix_mensuel < favorite.prix_initial;
  };

  const getPriceDrop = (favorite: any) => {
    if (!hasPriceDrop(favorite)) return null;
    const drop = favorite.prix_initial - favorite.property.prix_mensuel;
    const percentage = (drop / favorite.prix_initial) * 100;
    return { drop, percentage };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto p-6 max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <Skeleton className="h-48 w-full" />
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const selectedFavorites = favorites.filter(f => selectedForComparison.has(f.id));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Mes favoris</h1>
            <p className="text-muted-foreground">
              {favorites.length} propriété(s) favorite(s)
            </p>
          </div>
          <div className="flex gap-2">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'grid' | 'list')}>
              <TabsList>
                <TabsTrigger value="grid" className="gap-2">
                  <Grid3x3 className="h-4 w-4" />
                  Grille
                </TabsTrigger>
                <TabsTrigger value="list" className="gap-2">
                  <LayoutList className="h-4 w-4" />
                  Liste
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {selectedForComparison.size > 0 && (
          <Card className="mb-6 border-primary">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Mode comparaison ({selectedForComparison.size}/4)</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedForComparison(new Set())}
                  >
                    Annuler
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate('/favorites/compare', { state: { favorites: selectedFavorites } })}
                    disabled={selectedForComparison.size < 2}
                  >
                    Comparer ({selectedForComparison.size})
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                Sélectionnez 2 à 4 propriétés pour les comparer
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {favorites.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Heart className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Aucun favori</h3>
              <p className="text-muted-foreground mb-6 text-center max-w-md">
                Explorez les propriétés et ajoutez-les à vos favoris en cliquant sur le cœur
              </p>
              <Button onClick={() => navigate('/properties')}>
                Découvrir les propriétés
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((favorite) => (
              favorite.property && (
                <div key={favorite.id} className="relative">
                  {selectedForComparison.size > 0 && (
                    <div className="absolute top-2 right-2 z-10">
                      <Button
                        variant={selectedForComparison.has(favorite.id) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleComparison(favorite.id)}
                      >
                        {selectedForComparison.has(favorite.id) ? 'Sélectionné' : 'Comparer'}
                      </Button>
                    </div>
                  )}
                  <PropertyCard property={favorite.property} />
                  {hasPriceDrop(favorite) && (
                    <div className="mt-2">
                      <Badge variant="default" className="bg-green-600 gap-1">
                        <TrendingDown className="h-3 w-3" />
                        Prix baissé de {getPriceDrop(favorite)?.percentage.toFixed(1)}%
                      </Badge>
                    </div>
                  )}
                </div>
              )
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {favorites.map((favorite) => (
              favorite.property && (
                <Card key={favorite.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex gap-6">
                      <div className="relative w-48 h-32 flex-shrink-0 rounded-lg overflow-hidden">
                        <img
                          src={favorite.property.images?.[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400'}
                          alt={favorite.property.titre}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2">
                          <FavoriteButton
                            property={favorite.property}
                            className="bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg"
                          />
                        </div>
                      </div>

                      <div className="flex-1 space-y-3">
                        <div>
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="text-xl font-semibold">{favorite.property.titre}</h3>
                              <div className="flex items-center gap-1 text-muted-foreground mt-1">
                                <MapPin className="h-4 w-4" />
                                <span>{favorite.property.ville}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-primary">
                                {favorite.property.prix_mensuel.toLocaleString()} FCFA
                              </p>
                              {hasPriceDrop(favorite) && (
                                <div className="flex items-center gap-1 text-green-600 text-sm mt-1">
                                  <TrendingDown className="h-4 w-4" />
                                  <span>-{getPriceDrop(favorite)?.percentage.toFixed(1)}%</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <Home className="h-4 w-4 text-muted-foreground" />
                              <span>{favorite.property.nombre_pieces} pièces</span>
                            </div>
                            {favorite.property.surface_m2 && (
                              <div className="flex items-center gap-1">
                                <Maximize2 className="h-4 w-4 text-muted-foreground" />
                                <span>{favorite.property.surface_m2} m²</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-sm text-muted-foreground">
                          Ajouté le {format(new Date(favorite.created_at), 'PPP', { locale: fr })}
                        </div>

                        {editingNotes === favorite.id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={notesValue}
                              onChange={(e) => setNotesValue(e.target.value)}
                              placeholder="Ajoutez vos notes..."
                              className="min-h-[80px]"
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => saveNotes(favorite.id)}>
                                Sauvegarder
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingNotes(null)}>
                                Annuler
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            {favorite.notes && (
                              <p className="text-sm mb-2 p-3 bg-muted rounded-md">
                                {favorite.notes}
                              </p>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEditNotes(favorite)}
                              className="gap-2"
                            >
                              <FileText className="h-4 w-4" />
                              {favorite.notes ? 'Modifier les notes' : 'Ajouter des notes'}
                            </Button>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button onClick={() => navigate(`/properties/${favorite.property.id}`)}>
                            Voir les détails
                          </Button>
                          {selectedForComparison.size > 0 && (
                            <Button
                              variant={selectedForComparison.has(favorite.id) ? "default" : "outline"}
                              onClick={() => toggleComparison(favorite.id)}
                            >
                              {selectedForComparison.has(favorite.id) ? 'Sélectionné' : 'Comparer'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Favorites;
