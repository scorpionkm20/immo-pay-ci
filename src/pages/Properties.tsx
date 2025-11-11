import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProperties } from '@/hooks/useProperties';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import PropertyCard from '@/components/PropertyCard';
import { Plus, Search, SlidersHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Properties = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { properties, loading } = useProperties();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVille, setFilterVille] = useState('all');
  const [filterQuartier, setFilterQuartier] = useState('all');
  const [priceRange, setPriceRange] = useState([0, 1000000]);
  const [filterPieces, setFilterPieces] = useState('all');
  const [selectedEquipements, setSelectedEquipements] = useState<string[]>([]);

  const equipements = ['Climatisation', 'Parking', 'Jardin', 'Piscine', 'Sécurité 24h'];

  const filteredProperties = properties.filter(property => {
    const matchesSearch = property.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         property.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         property.adresse.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesVille = filterVille === 'all' || property.ville === filterVille;
    const matchesQuartier = filterQuartier === 'all' || property.quartier === filterQuartier;
    const matchesPrice = property.prix_mensuel >= priceRange[0] && property.prix_mensuel <= priceRange[1];
    const matchesPieces = filterPieces === 'all' || property.nombre_pieces?.toString() === filterPieces;
    
    const matchesEquipements = selectedEquipements.length === 0 || 
      selectedEquipements.every(eq => property.equipements?.includes(eq));
    
    return matchesSearch && matchesVille && matchesQuartier && matchesPrice && matchesPieces && matchesEquipements;
  });

  const availableProperties = filteredProperties.filter(p => p.statut === 'disponible');
  const villes = Array.from(new Set(properties.map(p => p.ville)));
  const quartiers = Array.from(new Set(properties.map(p => p.quartier).filter(Boolean)));
  const maxPrice = Math.max(...properties.map(p => p.prix_mensuel), 1000000);

  const toggleEquipement = (equipement: string) => {
    setSelectedEquipements(prev =>
      prev.includes(equipement)
        ? prev.filter(e => e !== equipement)
        : [...prev, equipement]
    );
  };

  const resetFilters = () => {
    setFilterVille('all');
    setFilterQuartier('all');
    setPriceRange([0, maxPrice]);
    setFilterPieces('all');
    setSelectedEquipements([]);
  };

  const FiltersContent = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-3">Prix mensuel (FCFA)</h3>
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
        <h3 className="text-sm font-semibold mb-3">Ville</h3>
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
        <h3 className="text-sm font-semibold mb-3">Quartier</h3>
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
        <h3 className="text-sm font-semibold mb-3">Nombre de pièces</h3>
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
        <h3 className="text-sm font-semibold mb-3">Équipements</h3>
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
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {equipement}
              </label>
            </div>
          ))}
        </div>
      </div>

      <Button onClick={resetFilters} variant="outline" className="w-full">
        Réinitialiser les filtres
      </Button>
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

        {/* Search Bar */}
        <div className="flex gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une propriété..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Mobile Filters Button */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="lg:hidden">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filtres
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
            {filteredProperties.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-lg text-muted-foreground">Aucune propriété trouvée</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProperties.map((property) => (
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
