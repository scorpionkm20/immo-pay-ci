import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProperties } from '@/hooks/useProperties';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PropertyCard from '@/components/PropertyCard';
import { Plus, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Properties = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { properties, loading } = useProperties();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVille, setFilterVille] = useState('all');

  const filteredProperties = properties.filter(property => {
    const matchesSearch = property.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         property.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         property.adresse.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesVille = filterVille === 'all' || property.ville === filterVille;
    
    return matchesSearch && matchesVille;
  });

  const availableProperties = filteredProperties.filter(p => p.statut === 'disponible');
  const villes = Array.from(new Set(properties.map(p => p.ville)));

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

        {/* Filters */}
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
          <Select value={filterVille} onValueChange={setFilterVille}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Ville" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les villes</SelectItem>
              {villes.map(ville => (
                <SelectItem key={ville} value={ville}>{ville}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Properties Grid */}
        {filteredProperties.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-lg text-muted-foreground">Aucune propriété trouvée</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Properties;
