import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Property } from '@/hooks/useProperties';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Home, Square, Euro } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

const PropertyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProperty = async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .single();

      if (data) {
        setProperty(data);
      }
      setLoading(false);
    };

    fetchProperty();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Propriété non trouvée</p>
      </div>
    );
  }

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

  const images = property.images && property.images.length > 0 
    ? property.images 
    : ['https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800'];

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-5xl mx-auto px-4">
        <Button variant="ghost" onClick={() => navigate('/properties')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour aux annonces
        </Button>

        <Card>
          <CardContent className="p-0">
            {/* Image Carousel */}
            <Carousel className="w-full">
              <CarouselContent>
                {images.map((image, index) => (
                  <CarouselItem key={index}>
                    <div className="relative h-96 w-full">
                      <img
                        src={image}
                        alt={`${property.titre} - ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {images.length > 1 && (
                <>
                  <CarouselPrevious className="left-4" />
                  <CarouselNext className="right-4" />
                </>
              )}
            </Carousel>

            {/* Property Info */}
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-bold mb-2">{property.titre}</h1>
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {property.adresse}, {property.quartier ? `${property.quartier}, ` : ''}{property.ville}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-primary mb-2">
                    {property.prix_mensuel.toLocaleString()} FCFA
                    <span className="text-sm text-muted-foreground">/mois</span>
                  </p>
                  {getStatusBadge(property.statut)}
                </div>
              </div>

              {/* Key Features */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 flex items-center gap-2">
                    <Home className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Type</p>
                      <p className="font-semibold capitalize">{property.type_propriete}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center gap-2">
                    <Home className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Pièces</p>
                      <p className="font-semibold">{property.nombre_pieces}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center gap-2">
                    <Square className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Surface</p>
                      <p className="font-semibold">{property.surface_m2 || 'N/A'} m²</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Description */}
              <div>
                <h2 className="text-xl font-semibold mb-3">Description</h2>
                <p className="text-muted-foreground whitespace-pre-line">{property.description}</p>
              </div>

              {/* Financial Info */}
              <div>
                <h2 className="text-xl font-semibold mb-3">Informations financières</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Euro className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Loyer mensuel</p>
                      <p className="font-semibold">{property.prix_mensuel.toLocaleString()} FCFA</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Euro className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Caution</p>
                      <p className="font-semibold">{property.caution.toLocaleString()} FCFA</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Equipements */}
              {property.equipements && property.equipements.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-3">Équipements</h2>
                  <div className="flex flex-wrap gap-2">
                    {property.equipements.map((equipement, index) => (
                      <Badge key={index} variant="outline">{equipement}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              {property.statut === 'disponible' && user && userRole === 'locataire' && (
                <div className="pt-6 border-t">
                  <Button size="lg" className="w-full">
                    Payer la caution et réserver
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PropertyDetail;
