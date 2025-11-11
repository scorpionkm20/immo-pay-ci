import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProperties } from '@/hooks/useProperties';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import PropertyCard from '@/components/PropertyCard';
import { Plus, Search, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Properties = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { properties, loading } = useProperties();
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVille, setFilterVille] = useState('all');
  const [filterQuartier, setFilterQuartier] = useState('all');
  const [filterTypePropriety, setFilterTypePropriety] = useState('all');
  const [priceRange, setPriceRange] = useState([0, 1000000]);
  const [surfaceRange, setSurfaceRange] = useState([0, 1000]);
  const [filterPieces, setFilterPieces] = useState('all');
  const [selectedEquipements, setSelectedEquipements] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('date_desc');

  const equipements = ['Climatisation', 'Parking', 'Jardin', 'Piscine', 'Sécurité 24h'];
  const typesPropriety = ['Appartement', 'Maison', 'Studio', 'Villa', 'Duplex', 'Bureau'];

  // Calculate max values for sliders
  const maxPrice = useMemo(() => 
    Math.max(...properties.map(p => p.prix_mensuel), 1000000),
    [properties]
  );
  
  const maxSurface = useMemo(() => 
    Math.max(...properties.map(p => p.surface_m2 || 0), 1000),
    [properties]
  );

  // Get unique values for dropdowns
  const villes = useMemo(() => 
    Array.from(new Set(properties.map(p => p.ville))).sort(),
    [properties]
  );
  
  const quartiers = useMemo(() => 
    Array.from(new Set(properties.map(p => p.quartier).filter(Boolean))).sort(),
    [properties]
  );

  // Filter and sort properties
  const filteredAndSortedProperties = useMemo(() => {
    let filtered = properties.filter(property => {
      const matchesSearch = searchTerm === '' || 
        property.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.adresse.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.ville.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.quartier?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesVille = filterVille === 'all' || property.ville === filterVille;
      const matchesQuartier = filterQuartier === 'all' || property.quartier === filterQuartier;
      const matchesType = filterTypePropriety === 'all' || property.type_propriete === filterTypePropriety;
      const matchesPrice = property.prix_mensuel >= priceRange[0] && property.prix_mensuel <= priceRange[1];
      const matchesSurface = !property.surface_m2 || 
        (property.surface_m2 >= surfaceRange[0] && property.surface_m2 <= surfaceRange[1]);
      const matchesPieces = filterPieces === 'all' || property.nombre_pieces?.toString() === filterPieces;
      
      const matchesEquipements = selectedEquipements.length === 0 || 
        selectedEquipements.every(eq => property.equipements?.includes(eq));
      
      return matchesSearch && matchesVille && matchesQuartier && matchesType && 
             matchesPrice && matchesSurface && matchesPieces && matchesEquipements;
    });

    // Sort properties
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price_asc':
          return a.prix_mensuel - b.prix_mensuel;
        case 'price_desc':
          return b.prix_mensuel - a.prix_mensuel;
        case 'surface_asc':
          return (a.surface_m2 || 0) - (b.surface_m2 || 0);
        case 'surface_desc':
          return (b.surface_m2 || 0) - (a.surface_m2 || 0);
        case 'pieces_asc':
          return a.nombre_pieces - b.nombre_pieces;
        case 'pieces_desc':
          return b.nombre_pieces - a.nombre_pieces;
        case 'date_desc':
        default:
          return new Date(b.date_publication).getTime() - new Date(a.date_publication).getTime();
      }
    });

    return filtered;
  }, [properties, searchTerm, filterVille, filterQuartier, filterTypePropriety, 
      priceRange, surfaceRange, filterPieces, selectedEquipements, sortBy]);

  const availableProperties = filteredAndSortedProperties.filter(p => p.statut === 'disponible');

  const toggleEquipement = (equipement: string) => {
    setSelectedEquipements(prev =>
      prev.includes(equipement)
        ? prev.filter(e => e !== equipement)
        : [...prev, equipement]
    );
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterVille('all');
    setFilterQuartier('all');
    setFilterTypePropriety('all');
    setPriceRange([0, maxPrice]);
    setSurfaceRange([0, maxSurface]);
    setFilterPieces('all');
    setSelectedEquipements([]);
    setSortBy('date_desc');
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterVille !== 'all') count++;
    if (filterQuartier !== 'all') count++;
    if (filterTypePropriety !== 'all') count++;
    if (priceRange[0] !== 0 || priceRange[1] !== maxPrice) count++;
    if (surfaceRange[0] !== 0 || surfaceRange[1] !== maxSurface) count++;
    if (filterPieces !== 'all') count++;
    if (selectedEquipements.length > 0) count++;
    return count;
  }, [filterVille, filterQuartier, filterTypePropriety, priceRange, surfaceRange, 
      filterPieces, selectedEquipements, maxPrice, maxSurface]);

  const FiltersContent = () => (
    <div className="space-y-6">
      {activeFiltersCount > 0 && (
        <div className="flex items-center justify-between pb-4 border-b">
          <Badge variant="secondary">{activeFiltersCount} filtre(s) actif(s)</Badge>
          <Button onClick={resetFilters} variant="ghost" size="sm">
            Réinitialiser
          </Button>
        </div>
      )}

      <div>
        <Label className="text-sm font-semibold mb-3 block">Prix mensuel (FCFA)</Label>
        <Slider
          value={priceRange}
          onValueChange={setPriceRange}
          max={maxPrice}
          step={10000}
          className="mb-2"
        />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{priceRange[0].toLocaleString()}</span>
          <span>{priceRange[1].toLocaleString()}</span>
        </div>
      </div>

      <div>
        <Label className="text-sm font-semibold mb-3 block">Surface (m²)</Label>
        <Slider
          value={surfaceRange}
          onValueChange={setSurfaceRange}
          max={maxSurface}
          step={10}
          className="mb-2"
        />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{surfaceRange[0]} m²</span>
          <span>{surfaceRange[1]} m²</span>
        </div>
      </div>

      <div>
        <Label className="text-sm font-semibold mb-3 block">Ville</Label>
        <Select value={filterVille} onValueChange={setFilterVille}>
          <SelectTrigger>
            <SelectValue placeholder="Toutes les villes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les villes</SelectItem>
            {villes.map(ville => (
              <SelectItem key={ville} value={ville}>{ville}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-sm font-semibold mb-3 block">Quartier</Label>
        <Select value={filterQuartier} onValueChange={setFilterQuartier}>
          <SelectTrigger>
            <SelectValue placeholder="Tous les quartiers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les quartiers</SelectItem>
            {quartiers.map(quartier => (
              <SelectItem key={quartier} value={quartier}>{quartier}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-sm font-semibold mb-3 block">Type de propriété</Label>
        <Select value={filterTypePropriety} onValueChange={setFilterTypePropriety}>
          <SelectTrigger>
            <SelectValue placeholder="Tous les types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {typesPropriety.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-sm font-semibold mb-3 block">Nombre de pièces</Label>
        <Select value={filterPieces} onValueChange={setFilterPieces}>
          <SelectTrigger>
            <SelectValue placeholder="Toutes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="1">1 pièce</SelectItem>
            <SelectItem value="2">2 pièces</SelectItem>
            <SelectItem value="3">3 pièces</SelectItem>
            <SelectItem value="4">4 pièces</SelectItem>
            <SelectItem value="5">5+ pièces</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-sm font-semibold mb-3 block">Équipements</Label>
        <div className="space-y-3">
          {equipements.map(equipement => (
            <div key={equipement} className="flex items-center space-x-2">
              <Checkbox
                id={equipement}
                checked={selectedEquipements.includes(equipement)}
                onCheckedChange={() => toggleEquipement(equipement)}
              />
              <label
                htmlFor={equipement}
                className="text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {equipement}
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Chargement des annonces...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Annonces Immobilières</h1>
            <p className="text-muted-foreground">
              {availableProperties.length} propriétés disponibles
            </p>
          </div>
          <div className="flex gap-2">
            {user && (
              <Button variant="outline" onClick={() => navigate('/')}>
                Tableau de bord
              </Button>
            )}
            {userRole === 'gestionnaire' && (
              <Button onClick={() => navigate('/properties/create')}>
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle annonce
              </Button>
            )}
          </div>
        </div>

        {/* Search Bar and Sort */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par titre, adresse, ville, quartier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            {/* Sort Dropdown */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[200px]">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc">Plus récentes</SelectItem>
                <SelectItem value="price_asc">Prix croissant</SelectItem>
                <SelectItem value="price_desc">Prix décroissant</SelectItem>
                <SelectItem value="surface_asc">Surface croissante</SelectItem>
                <SelectItem value="surface_desc">Surface décroissante</SelectItem>
                <SelectItem value="pieces_asc">Moins de pièces</SelectItem>
                <SelectItem value="pieces_desc">Plus de pièces</SelectItem>
              </SelectContent>
            </Select>

            {/* Mobile Filters Button */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="lg:hidden relative">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Filtres
                  {activeFiltersCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Filtres de recherche</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <FiltersContent />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Desktop Filters Sidebar */}
          <aside className="hidden lg:block w-80 shrink-0">
            <div className="sticky top-4 bg-card border rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Filtres de recherche</h2>
              <FiltersContent />
            </div>
          </aside>

          {/* Properties Grid */}
          <div className="flex-1">
            {filteredAndSortedProperties.length === 0 ? (
              <div className="text-center py-16">
                <Search className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">Aucune propriété trouvée</p>
                <p className="text-muted-foreground mb-4">
                  Essayez de modifier vos critères de recherche
                </p>
                {activeFiltersCount > 0 && (
                  <Button onClick={resetFilters} variant="outline">
                    Réinitialiser les filtres
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredAndSortedProperties.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Properties;
