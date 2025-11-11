import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLeases } from '@/hooks/useLeases';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Property } from '@/hooks/useProperties';
import { z } from 'zod';

const leaseSchema = z.object({
  locataire_id: z.string().min(1, "Sélectionnez un locataire"),
  date_debut: z.string().min(1, "Date de début requise"),
  date_fin: z.string().optional(),
  caution_payee: z.boolean()
});

interface AssignLeaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: Property | null;
}

interface Locataire {
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
}

const AssignLeaseDialog = ({ open, onOpenChange, property }: AssignLeaseDialogProps) => {
  const { user } = useAuth();
  const { createLease } = useLeases();
  const [loading, setLoading] = useState(false);
  const [locataires, setLocataires] = useState<Locataire[]>([]);
  const [errors, setErrors] = useState<any>({});
  
  const [formData, setFormData] = useState({
    locataire_id: '',
    date_debut: '',
    date_fin: '',
    caution_payee: false
  });

  useEffect(() => {
    if (open) {
      fetchLocataires();
    }
  }, [open]);

  const fetchLocataires = async () => {
    // Get all users with 'locataire' role joined with their profiles
    const { data, error } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        profiles!inner (
          full_name,
          phone
        )
      `)
      .eq('role', 'locataire');

    if (data && !error) {
      // Transform the data into the format we need
      const locatairesData = data.map(item => ({
        user_id: item.user_id,
        full_name: (item.profiles as any).full_name,
        phone: (item.profiles as any).phone || '',
        email: '' // We'll show the name primarily
      }));
      
      setLocataires(locatairesData);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!property || !user) return;

    const result = leaseSchema.safeParse(formData);
    
    if (!result.success) {
      const newErrors: any = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) newErrors[err.path[0]] = err.message;
      });
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    const leaseData = {
      property_id: property.id,
      locataire_id: formData.locataire_id,
      gestionnaire_id: user.id,
      date_debut: formData.date_debut,
      date_fin: formData.date_fin || undefined,
      montant_mensuel: property.prix_mensuel,
      caution_montant: property.caution,
      caution_payee: formData.caution_payee
    };

    const { error } = await createLease(leaseData);

    setLoading(false);

    if (!error) {
      // Reset form
      setFormData({
        locataire_id: '',
        date_debut: '',
        date_fin: '',
        caution_payee: false
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Attribuer un bail</DialogTitle>
          <DialogDescription>
            Attribuez cette propriété à un locataire
          </DialogDescription>
        </DialogHeader>

        {property && (
          <div className="mb-4 p-4 bg-muted rounded-lg">
            <p className="font-semibold">{property.titre}</p>
            <p className="text-sm text-muted-foreground">
              Loyer: {property.prix_mensuel.toLocaleString()} FCFA/mois
            </p>
            <p className="text-sm text-muted-foreground">
              Caution: {property.caution.toLocaleString()} FCFA
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="locataire">Locataire *</Label>
            <Select
              value={formData.locataire_id}
              onValueChange={(value) => setFormData({ ...formData, locataire_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez un locataire" />
              </SelectTrigger>
              <SelectContent>
                {locataires.map((locataire) => (
                  <SelectItem key={locataire.user_id} value={locataire.user_id}>
                    {locataire.full_name} {locataire.phone && `(${locataire.phone})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.locataire_id && (
              <p className="text-sm text-destructive">{errors.locataire_id}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date_debut">Date de début *</Label>
              <Input
                id="date_debut"
                type="date"
                value={formData.date_debut}
                onChange={(e) => setFormData({ ...formData, date_debut: e.target.value })}
                required
              />
              {errors.date_debut && (
                <p className="text-sm text-destructive">{errors.date_debut}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date_fin">Date de fin</Label>
              <Input
                id="date_fin"
                type="date"
                value={formData.date_fin}
                onChange={(e) => setFormData({ ...formData, date_fin: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="caution_payee"
              checked={formData.caution_payee}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, caution_payee: checked as boolean })
              }
            />
            <Label
              htmlFor="caution_payee"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              La caution a été payée
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Attribution...' : 'Attribuer le bail'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AssignLeaseDialog;
