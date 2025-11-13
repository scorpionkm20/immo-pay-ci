import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface JoinSpaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const JoinSpaceDialog = ({ open, onOpenChange, onSuccess }: JoinSpaceDialogProps) => {
  const [code, setCode] = useState('');
  const [role, setRole] = useState<'gestionnaire' | 'proprietaire' | 'locataire'>('locataire');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('join_space_with_code', {
        code: code.toUpperCase().trim(),
        user_role: role
      });

      if (error) throw error;

      toast({
        title: 'Espace rejoint',
        description: 'Vous avez rejoint l\'espace avec succès!'
      });

      setCode('');
      setRole('locataire');
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.message || 'Code d\'invitation invalide'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleJoin}>
          <DialogHeader>
            <DialogTitle>Rejoindre un espace</DialogTitle>
            <DialogDescription>
              Entrez le code d'invitation que vous avez reçu par email ou WhatsApp
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code d'invitation</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Ex: ABC12345"
                maxLength={8}
                required
                className="uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Votre rôle</Label>
              <Select value={role} onValueChange={(value: any) => setRole(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="locataire">Locataire</SelectItem>
                  <SelectItem value="proprietaire">Propriétaire</SelectItem>
                  <SelectItem value="gestionnaire">Gestionnaire</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Rejoindre
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
