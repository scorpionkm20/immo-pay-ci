import { useLocation, useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  MapPin, 
  Home, 
  Maximize2, 
  DollarSign,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { PropertyFavorite } from '@/hooks/usePropertyFavorites';

const FavoritesCompare = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const favorites = (location.state?.favorites || []) as PropertyFavorite[];

  if (favorites.length < 2) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto p-6 max-w-4xl">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <XCircle className="h-16 w-16 text-destructive mb-4" />
              <h3 className="text-xl font-semibold mb-2">Comparaison impossible</h3>
              <p className="text-muted-foreground mb-6 text-center max-w-md">
                Veuillez sélectionner au moins 2 propriétés pour les comparer
              </p>
              <Button onClick={() => navigate('/favorites')}>
                Retour aux favoris
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const allEquipements = Array.from(
    new Set(favorites.flatMap(f => f.property?.equipements || []))
  ).sort();

  const compareField = (field: string) => {
    return favorites.map(f => {
      const property = f.property;
      if (!property) return null;

      switch (field) {
        case 'prix':
          return property.prix_mensuel;
        case 'caution':
          return property.caution;
        case 'pieces':
          return property.nombre_pieces;
        case 'surface':
          return property.surface_m2;
        default:
          return null;
      }
    });
  };

  const getBestValue = (field: string) => {
    const values = compareField(field);
    if (field === 'prix' || field === 'caution') {
      return Math.min(...values.filter((v): v is number => v !== null));
    } else {
      return Math.max(...values.filter((v): v is number => v !== null));
    }
  };

  const isBestValue = (favorite: PropertyFavorite, field: string): boolean => {
    const property = favorite.property;
    if (!property) return false;

    let value: number | null = null;
    switch (field) {
      case 'prix':
        value = property.prix_mensuel;
        break;
      case 'caution':
        value = property.caution;
        break;
      case 'pieces':
        value = property.nombre_pieces;
        break;
      case 'surface':
        value = property.surface_m2;
        break;
    }

    return value === getBestValue(field);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="icon" onClick={() => navigate('/favorites')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold mb-2">Comparaison des propriétés</h1>
            <p className="text-muted-foreground">
              Comparaison de {favorites.length} propriétés favorites
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <div className="grid gap-4" style={{ gridTemplateColumns: `200px repeat(${favorites.length}, 1fr)` }}>
              {/* Header Row - Images */}
              <div className="font-semibold p-4">Propriété</div>
              {favorites.map((favorite) => (
                <Card key={favorite.id} className="overflow-hidden">
                  <div className="relative h-48 w-full">
                    <img
                      src={favorite.property?.images?.[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400'}
                      alt={favorite.property?.titre}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{favorite.property?.titre}</CardTitle>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{favorite.property?.ville}</span>
                    </div>
                  </CardHeader>
                </Card>
              ))}

              {/* Prix Row */}
              <div className="font-semibold p-4 flex items-center">
                <DollarSign className="h-4 w-4 mr-2" />
                Prix mensuel
              </div>
              {favorites.map((favorite) => (
                <Card key={favorite.id} className={isBestValue(favorite, 'prix') ? 'border-primary' : ''}>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-primary">
                      {favorite.property?.prix_mensuel.toLocaleString()} FCFA
                    </p>
                    {isBestValue(favorite, 'prix') && (
                      <Badge variant="default" className="mt-2 bg-green-600">
                        Meilleur prix
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}

              {/* Caution Row */}
              <div className="font-semibold p-4 flex items-center">
                <DollarSign className="h-4 w-4 mr-2" />
                Caution
              </div>
              {favorites.map((favorite) => (
                <Card key={favorite.id} className={isBestValue(favorite, 'caution') ? 'border-primary' : ''}>
                  <CardContent className="p-4 text-center">
                    <p className="font-semibold">
                      {favorite.property?.caution.toLocaleString()} FCFA
                    </p>
                    {isBestValue(favorite, 'caution') && (
                      <Badge variant="outline" className="mt-2">Plus bas</Badge>
                    )}
                  </CardContent>
                </Card>
              ))}

              {/* Pièces Row */}
              <div className="font-semibold p-4 flex items-center">
                <Home className="h-4 w-4 mr-2" />
                Nombre de pièces
              </div>
              {favorites.map((favorite) => (
                <Card key={favorite.id} className={isBestValue(favorite, 'pieces') ? 'border-primary' : ''}>
                  <CardContent className="p-4 text-center">
                    <p className="text-lg font-semibold">{favorite.property?.nombre_pieces} pièces</p>
                    {isBestValue(favorite, 'pieces') && (
                      <Badge variant="outline" className="mt-2">Le plus</Badge>
                    )}
                  </CardContent>
                </Card>
              ))}

              {/* Surface Row */}
              <div className="font-semibold p-4 flex items-center">
                <Maximize2 className="h-4 w-4 mr-2" />
                Surface
              </div>
              {favorites.map((favorite) => (
                <Card key={favorite.id} className={isBestValue(favorite, 'surface') ? 'border-primary' : ''}>
                  <CardContent className="p-4 text-center">
                    <p className="text-lg font-semibold">
                      {favorite.property?.surface_m2 ? `${favorite.property.surface_m2} m²` : 'N/A'}
                    </p>
                    {isBestValue(favorite, 'surface') && favorite.property?.surface_m2 && (
                      <Badge variant="outline" className="mt-2">La plus grande</Badge>
                    )}
                  </CardContent>
                </Card>
              ))}

              {/* Type Row */}
              <div className="font-semibold p-4 flex items-center">Type</div>
              {favorites.map((favorite) => (
                <Card key={favorite.id}>
                  <CardContent className="p-4 text-center">
                    <Badge variant="secondary">{favorite.property?.type_propriete}</Badge>
                  </CardContent>
                </Card>
              ))}

              {/* Localisation Row */}
              <div className="font-semibold p-4 flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                Localisation
              </div>
              {favorites.map((favorite) => (
                <Card key={favorite.id}>
                  <CardContent className="p-4">
                    <p className="text-sm">
                      {favorite.property?.quartier && `${favorite.property.quartier}, `}
                      {favorite.property?.ville}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {favorite.property?.adresse}
                    </p>
                  </CardContent>
                </Card>
              ))}

              {/* Équipements Row */}
              <div className="font-semibold p-4 flex items-center">Équipements</div>
              {favorites.map((favorite) => (
                <Card key={favorite.id}>
                  <CardContent className="p-4">
                    {allEquipements.map(eq => (
                      <div key={eq} className="flex items-center gap-2 text-sm mb-1">
                        {favorite.property?.equipements?.includes(eq) ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className={!favorite.property?.equipements?.includes(eq) ? 'text-muted-foreground' : ''}>
                          {eq}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}

              {/* Actions Row */}
              <div className="font-semibold p-4"></div>
              {favorites.map((favorite) => (
                <Card key={favorite.id}>
                  <CardContent className="p-4">
                    <Button
                      className="w-full"
                      onClick={() => navigate(`/properties/${favorite.property_id}`)}
                    >
                      Voir les détails
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FavoritesCompare;
