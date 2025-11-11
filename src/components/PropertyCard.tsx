import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Home, Square, Euro } from 'lucide-react';
import { Property } from '@/hooks/useProperties';
import { useNavigate } from 'react-router-dom';
import { FavoriteButton } from '@/components/FavoriteButton';

interface PropertyCardProps {
  property: Property;
  showActions?: boolean;
  onEdit?: (property: Property) => void;
  onDelete?: (id: string) => void;
}

const PropertyCard = ({ property, showActions = false, onEdit, onDelete }: PropertyCardProps) => {
  const navigate = useNavigate();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'disponible':
        return <Badge variant="default" className="bg-green-600">Disponible</Badge>;
      case 'loue':
        return <Badge variant="secondary">Loué</Badge>;
      case 'en_attente_validation':
        return <Badge variant="outline">En attente</Badge>;
      case 'indisponible':
        return <Badge variant="destructive">Indisponible</Badge>;
      default:
        return null;
    }
  };

  const mainImage = property.images && property.images.length > 0 
    ? property.images[0] 
    : 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400';

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow group">
      <div className="relative h-48 w-full overflow-hidden">
        <img 
          src={mainImage} 
          alt={property.titre}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute top-2 left-2">
          <FavoriteButton 
            property={property}
            className="bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg"
          />
        </div>
        <div className="absolute top-2 right-2">
          {getStatusBadge(property.statut)}
        </div>
      </div>
      
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl">{property.titre}</CardTitle>
          <p className="text-2xl font-bold text-primary">{property.prix_mensuel.toLocaleString()} FCFA</p>
        </div>
        <CardDescription className="flex items-center gap-1">
          <MapPin className="h-4 w-4" />
          {property.quartier ? `${property.quartier}, ` : ''}{property.ville}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {property.description}
        </p>
        
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Home className="h-4 w-4 text-muted-foreground" />
            <span>{property.nombre_pieces} pièces</span>
          </div>
          {property.surface_m2 && (
            <div className="flex items-center gap-1">
              <Square className="h-4 w-4 text-muted-foreground" />
              <span>{property.surface_m2} m²</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Euro className="h-4 w-4 text-muted-foreground" />
            <span>Caution: {property.caution.toLocaleString()} FCFA</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        <Button 
          variant="default" 
          className="flex-1"
          onClick={() => navigate(`/properties/${property.id}`)}
        >
          Voir détails
        </Button>
        {showActions && (
          <>
            <Button variant="outline" onClick={() => onEdit?.(property)}>
              Modifier
            </Button>
            <Button variant="destructive" onClick={() => onDelete?.(property.id)}>
              Supprimer
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
};

export default PropertyCard;
