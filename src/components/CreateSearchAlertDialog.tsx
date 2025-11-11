import { useState } from 'react';
import { useSearchAlerts } from '@/hooks/useSearchAlerts';
import { useProperties } from '@/hooks/useProperties';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Bell } from 'lucide-react';

interface CreateSearchAlertDialogProps {
  children?: React.ReactNode;
  initialCriteria?: {
    ville?: string;
    quartier?: string;
    type_propriete?: string;
    prix_min?: number;
    prix_max?: number;
    surface_min?: number;
    surface_max?: number;
    nombre_pieces_min?: number;
    nombre_pieces_max?: number;
    equipements?: string[];
  };
}

export const CreateSearchAlertDialog = ({ children, initialCriteria }: CreateSearchAlertDialogProps) => {
  const { createAlert } = useSearchAlerts();
  const { properties } = useProperties();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [nomAlerte, setNomAlerte] = useState('');
  const [frequence, setFrequence] = useState<'instantane' | 'quotidien' | 'hebdomadaire'>('instantane');
  const [ville, setVille] = useState(initialCriteria?.ville || '');
  const [quartier, setQuartier] = useState(initialCriteria?.quartier || '');
  const [typePropriety, setTypePropriety] = useState(initialCriteria?.type_propriete || '');
  const [prixMin, setPrixMin] = useState(initialCriteria?.prix_min?.toString() || '');
  const [prixMax, setPrixMax] = useState(initialCriteria?.prix_max?.toString() || '');
  const [surfaceMin, setSurfaceMin] = useState(initialCriteria?.surface_min?.toString() || '');
  const [surfaceMax, setSurfaceMax] = useState(initialCriteria?.surface_max?.toString() || '');
  const [piecesMin, setPiecesMin] = useState(initialCriteria?.nombre_pieces_min?.toString() || '');
  const [piecesMax, setPiecesMax] = useState(initialCriteria?.nombre_pieces_max?.toString() || '');
  const [selectedEquipements, setSelectedEquipements] = useState<string[]>(initialCriteria?.equipements || []);

  const equipements = ['Climatisation', 'Parking', 'Jardin', 'Piscine', 'Sécurité 24h'];
  const typesPropriety = ['Appartement', 'Maison', 'Studio', 'Villa', 'Duplex', 'Bureau'];
  const villes = Array.from(new Set(properties.map(p => p.ville))).sort();
  const quartiers = Array.from(new Set(properties.map(p => p.quartier).filter(Boolean))).sort();

  const toggleEquipement = (equipement: string) => {
    setSelectedEquipements(prev =>
      prev.includes(equipement)
        ? prev.filter(e => e !== equipement)
        : [...prev, equipement]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nomAlerte.trim()) {
      return;
    }

    setLoading(true);

    const alertData = {
      nom_alerte: nomAlerte,
      actif: true,
      frequence,
      ville: ville || undefined,
      quartier: quartier || undefined,
      type_propriete: typePropriety || undefined,
      prix_min: prixMin ? parseFloat(prixMin) : undefined,
      prix_max: prixMax ? parseFloat(prixMax) : undefined,
      surface_min: surfaceMin ? parseFloat(surfaceMin) : undefined,
      surface_max: surfaceMax ? parseFloat(surfaceMax) : undefined,
      nombre_pieces_min: piecesMin ? parseInt(piecesMin) : undefined,
      nombre_pieces_max: piecesMax ? parseInt(piecesMax) : undefined,
      equipements: selectedEquipements.length > 0 ? selectedEquipements : undefined
    };

    const { error } = await createAlert(alertData);

    setLoading(false);

    if (!error) {
      setOpen(false);
      // Reset form
      setNomAlerte('');
      setFrequence('instantane');
      setVille('');
      setQuartier('');
      setTypePropriety('');
      setPrixMin('');
      setPrixMax('');
      setSurfaceMin('');
      setSurfaceMax('');
      setPiecesMin('');
      setPiecesMax('');
      setSelectedEquipements([]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Bell className="h-4 w-4 mr-2" />
            Créer une alerte
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer une alerte de recherche</DialogTitle>
          <DialogDescription>
            Soyez notifié quand une nouvelle propriété correspond à vos critères
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="nom">Nom de l'alerte *</Label>
            <Input
              id="nom"
              placeholder="Ex: Appartement 2 pièces à Douala"
              value={nomAlerte}
              onChange={(e) => setNomAlerte(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="frequence">Fréquence de notification</Label>
            <Select value={frequence} onValueChange={(v: any) => setFrequence(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="instantane">Instantané (dès qu'une propriété correspond)</SelectItem>
                <SelectItem value="quotidien">Quotidien (résumé journalier)</SelectItem>
                <SelectItem value="hebdomadaire">Hebdomadaire (résumé le lundi)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ville">Ville</Label>
              <Select value={ville} onValueChange={setVille}>
                <SelectTrigger>
                  <SelectValue placeholder="Toutes les villes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Toutes les villes</SelectItem>
                  {villes.map(v => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="quartier">Quartier</Label>
              <Select value={quartier} onValueChange={setQuartier}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous les quartiers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tous les quartiers</SelectItem>
                  {quartiers.map(q => (
                    <SelectItem key={q} value={q!}>{q}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="type">Type de propriété</Label>
            <Select value={typePropriety} onValueChange={setTypePropriety}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les types</SelectItem>
                {typesPropriety.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="prixMin">Prix minimum (FCFA)</Label>
              <Input
                id="prixMin"
                type="number"
                placeholder="0"
                value={prixMin}
                onChange={(e) => setPrixMin(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="prixMax">Prix maximum (FCFA)</Label>
              <Input
                id="prixMax"
                type="number"
                placeholder="Illimité"
                value={prixMax}
                onChange={(e) => setPrixMax(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="surfaceMin">Surface minimum (m²)</Label>
              <Input
                id="surfaceMin"
                type="number"
                placeholder="0"
                value={surfaceMin}
                onChange={(e) => setSurfaceMin(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="surfaceMax">Surface maximum (m²)</Label>
              <Input
                id="surfaceMax"
                type="number"
                placeholder="Illimité"
                value={surfaceMax}
                onChange={(e) => setSurfaceMax(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="piecesMin">Nombre de pièces minimum</Label>
              <Input
                id="piecesMin"
                type="number"
                placeholder="0"
                value={piecesMin}
                onChange={(e) => setPiecesMin(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="piecesMax">Nombre de pièces maximum</Label>
              <Input
                id="piecesMax"
                type="number"
                placeholder="Illimité"
                value={piecesMax}
                onChange={(e) => setPiecesMax(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Équipements requis</Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {equipements.map(equipement => (
                <div key={equipement} className="flex items-center space-x-2">
                  <Checkbox
                    id={`eq-${equipement}`}
                    checked={selectedEquipements.includes(equipement)}
                    onCheckedChange={() => toggleEquipement(equipement)}
                  />
                  <label
                    htmlFor={`eq-${equipement}`}
                    className="text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {equipement}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Création...' : 'Créer l\'alerte'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
