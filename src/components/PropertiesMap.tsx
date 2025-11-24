import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Property } from '@/hooks/useProperties';
import { useMapboxToken } from '@/hooks/useMapboxToken';
import { FavoriteButton } from '@/components/FavoriteButton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, MapPin, Home, Maximize2, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface PropertiesMapProps {
  properties: Property[];
  onPropertyClick?: (property: Property) => void;
}

export const PropertiesMap = ({ properties, onPropertyClick }: PropertiesMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const { token, loading } = useMapboxToken();
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const navigate = useNavigate();

  useEffect(() => {
    if (!token || !mapContainer.current || map.current) return;

    mapboxgl.accessToken = token;

    // Initialize map centered on Cameroon
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [11.5021, 3.8480], // Cameroon center
      zoom: 6,
    });

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    // Add fullscreen control
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    return () => {
      map.current?.remove();
    };
  }, [token]);

  useEffect(() => {
    if (!map.current || !token) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Geocode properties without coordinates
    const geocodeProperties = async () => {
      const propertiesNeedingGeocode = properties.filter(
        p => !p.latitude || !p.longitude || isNaN(Number(p.latitude)) || isNaN(Number(p.longitude))
      );

      for (const property of propertiesNeedingGeocode) {
        try {
          const { data, error } = await supabase.functions.invoke('geocode-address', {
            body: {
              address: property.adresse,
              ville: property.ville,
              quartier: property.quartier
            }
          });

          if (!error && data?.latitude && data?.longitude) {
            // Update property with coordinates
            await supabase
              .from('properties')
              .update({ 
                latitude: data.latitude, 
                longitude: data.longitude 
              })
              .eq('id', property.id);
            
            // Update local property object
            property.latitude = data.latitude;
            property.longitude = data.longitude;
          }
        } catch (err) {
          console.error(`Failed to geocode property ${property.id}:`, err);
        }
      }
    };

    // Run geocoding for properties without coordinates
    if (properties.some(p => !p.latitude || !p.longitude)) {
      geocodeProperties();
    }

    // Filter properties with valid coordinates and by status
    let validProperties = properties.filter(
      p => p.latitude && p.longitude && !isNaN(Number(p.latitude)) && !isNaN(Number(p.longitude))
    );

    // Apply status filter
    if (statusFilter !== 'all') {
      validProperties = validProperties.filter(p => p.statut === statusFilter);
    }

    if (validProperties.length === 0) return;

    // Function to add sources and layers
    const addMapLayers = () => {
      if (!map.current) return;

      // Create GeoJSON source
      const geojsonData: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: validProperties.map(property => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [Number(property.longitude), Number(property.latitude)]
          },
          properties: {
            id: property.id,
            titre: property.titre,
            prix: property.prix_mensuel,
            pieces: property.nombre_pieces,
            type: property.type_propriete,
            statut: property.statut,
            image: property.images?.[0] || ''
          }
        }))
      };

      // Remove existing source and layers if they exist
      if (map.current.getSource('properties')) {
        if (map.current.getLayer('clusters')) map.current.removeLayer('clusters');
        if (map.current.getLayer('cluster-count')) map.current.removeLayer('cluster-count');
        if (map.current.getLayer('unclustered-point')) map.current.removeLayer('unclustered-point');
        map.current.removeSource('properties');
      }

      // Add source with clustering
      map.current.addSource('properties', {
        type: 'geojson',
        data: geojsonData,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50
      });

      // Add cluster circles
      map.current.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'properties',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            'hsl(var(--primary))',
            10,
            'hsl(var(--chart-2))',
            30,
            'hsl(var(--destructive))'
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            20,
            10,
            30,
            30,
            40
          ],
          'circle-opacity': 0.8
        }
      });

      // Add cluster count
      map.current.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'properties',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 12
        },
        paint: {
          'text-color': '#ffffff'
        }
      });

      // Add unclustered points
      map.current.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'properties',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': [
            'match',
            ['get', 'statut'],
            'disponible', 'hsl(var(--primary))',
            'loue', 'hsl(var(--muted))',
            'hsl(var(--muted))'
          ],
          'circle-radius': 10,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
          'circle-opacity': 0.9
        }
      });

      // Click on cluster to zoom
      map.current.on('click', 'clusters', (e) => {
        if (!map.current) return;
        const features = map.current.queryRenderedFeatures(e.point, {
          layers: ['clusters']
        });
        const clusterId = features[0].properties?.cluster_id;
        const source = map.current.getSource('properties') as mapboxgl.GeoJSONSource;
        
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err || !map.current) return;
          const coordinates = (features[0].geometry as GeoJSON.Point).coordinates;
          map.current.easeTo({
            center: coordinates as [number, number],
            zoom: zoom
          });
        });
      });

      // Click on unclustered point
      map.current.on('click', 'unclustered-point', (e) => {
        if (!e.features || !e.features[0].properties) return;
        
        const propertyId = e.features[0].properties.id;
        const property = validProperties.find(p => p.id === propertyId);
        
        if (property) {
          setSelectedProperty(property);
          if (onPropertyClick) {
            onPropertyClick(property);
          }
        }
      });

      // Hover tooltips for properties
      map.current.on('mouseenter', 'unclustered-point', (e) => {
        if (!map.current || !e.features || !e.features[0].properties) return;
        
        map.current.getCanvas().style.cursor = 'pointer';
        
        const coordinates = (e.features[0].geometry as GeoJSON.Point).coordinates.slice();
        const props = e.features[0].properties;
        
        const property = validProperties.find(p => p.id === props.id);
        if (!property) return;

        // Create popup HTML
        const popupHTML = `
          <div class="p-2 min-w-[200px]">
            ${property.images?.[0] ? `
              <img src="${property.images[0]}" alt="${property.titre}" 
                   class="w-full h-24 object-cover rounded mb-2" />
            ` : ''}
            <h3 class="font-semibold text-sm mb-1">${property.titre}</h3>
            <p class="text-xs text-gray-600 mb-2">${property.ville} • ${property.quartier}</p>
            <div class="flex items-center justify-between text-xs mb-1">
              <span>${property.nombre_pieces} pièces</span>
              ${property.surface_m2 ? `<span>${property.surface_m2} m²</span>` : ''}
            </div>
            <p class="text-sm font-bold text-blue-600">${property.prix_mensuel.toLocaleString()} FCFA/mois</p>
            <p class="text-xs text-gray-500 mt-1">Cliquez pour plus de détails</p>
          </div>
        `;

        // Remove existing popup
        if (popupRef.current) {
          popupRef.current.remove();
        }

        // Create and show new popup
        popupRef.current = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 15,
          maxWidth: '250px'
        })
          .setLngLat(coordinates as [number, number])
          .setHTML(popupHTML)
          .addTo(map.current);
      });

      map.current.on('mouseleave', 'unclustered-point', () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = '';
        }
        if (popupRef.current) {
          popupRef.current.remove();
          popupRef.current = null;
        }
      });

      // Change cursor on hover for clusters
      map.current.on('mouseenter', 'clusters', () => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
      });
      map.current.on('mouseleave', 'clusters', () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
      });

      // Fit bounds to show all properties
      if (validProperties.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        validProperties.forEach(property => {
          bounds.extend([Number(property.longitude), Number(property.latitude)]);
        });
        map.current.fitBounds(bounds, {
          padding: 50,
          maxZoom: 15
        });
      }
    };

    // Wait for style to load before adding layers
    if (map.current.isStyleLoaded()) {
      addMapLayers();
    } else {
      map.current.once('load', addMapLayers);
    }

  }, [properties, token, onPropertyClick, statusFilter]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted">
        <div className="text-center">
          <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground">Chargement de la carte...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted">
        <div className="text-center">
          <MapPin className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <p className="text-destructive">Impossible de charger la carte</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0 rounded-lg" />
      
      {/* Filters and Legend */}
      <Card className="absolute top-4 left-4 z-10 bg-background">
        <CardContent className="p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtres</span>
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full bg-background">
              <SelectValue placeholder="Statut du bien" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="all">Tous les biens</SelectItem>
              <SelectItem value="disponible">Disponibles uniquement</SelectItem>
              <SelectItem value="loue">Loués uniquement</SelectItem>
            </SelectContent>
          </Select>

          <div className="pt-2 border-t space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span>Disponible</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-muted" />
              <span>Loué</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: 'hsl(var(--primary))' }} />
              <span>Cluster</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Property Popup */}
      {selectedProperty && (
        <Card className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-80 max-w-[calc(100vw-2rem)]">
          <CardContent className="p-4">
            <div className="absolute top-2 right-2 flex gap-1">
              <FavoriteButton 
                property={selectedProperty}
                className="bg-white/90 backdrop-blur-sm hover:bg-white"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedProperty(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-3">
              {selectedProperty.images?.[0] && (
                <img
                  src={selectedProperty.images[0]}
                  alt={selectedProperty.titre}
                  className="w-full h-32 object-cover rounded-md"
                />
              )}
              
              <div>
                <h3 className="font-semibold text-lg mb-1">{selectedProperty.titre}</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {selectedProperty.ville} • {selectedProperty.quartier}
                </p>
                
                <div className="flex items-center gap-4 text-sm mb-3">
                  <div className="flex items-center gap-1">
                    <Home className="h-4 w-4" />
                    <span>{selectedProperty.nombre_pieces} pièces</span>
                  </div>
                  {selectedProperty.surface_m2 && (
                    <div className="flex items-center gap-1">
                      <Maximize2 className="h-4 w-4" />
                      <span>{selectedProperty.surface_m2} m²</span>
                    </div>
                  )}
                </div>
                
                <p className="text-xl font-bold text-primary mb-3">
                  {selectedProperty.prix_mensuel.toLocaleString()} FCFA/mois
                </p>
                
                <Button 
                  className="w-full" 
                  onClick={() => navigate(`/properties/${selectedProperty.id}`)}
                >
                  Voir les détails
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
