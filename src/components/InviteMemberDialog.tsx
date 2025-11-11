import { useState } from "react";
import { useManagementSpaces } from "@/hooks/useManagementSpaces";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaceId: string;
  onMemberAdded?: () => void;
}

export const InviteMemberDialog = ({
  open,
  onOpenChange,
  spaceId,
  onMemberAdded,
}: InviteMemberDialogProps) => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<'gestionnaire' | 'proprietaire' | 'locataire'>('locataire');
  const [loading, setLoading] = useState(false);
  const { addMember } = useManagementSpaces();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // First, find the user by email
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', email) // We'll need to add email to profiles or search in auth.users
        .single();

      if (profileError) {
        // Try to search by looking up in our profiles with a LIKE query
        // This is a workaround - ideally we'd have email in profiles or use a server function
        toast({
          variant: "destructive",
          title: "Utilisateur non trouvé",
          description: "Veuillez entrer l'ID utilisateur au lieu de l'email pour le moment",
        });
        setLoading(false);
        return;
      }

      const { error } = await addMember(spaceId, email, role);
      
      if (!error) {
        setEmail("");
        setRole('locataire');
        onOpenChange(false);
        onMemberAdded?.();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de l'invitation",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Inviter un membre</DialogTitle>
            <DialogDescription>
              Ajoutez un nouveau membre à cet espace de gestion
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="userId">ID Utilisateur</Label>
              <Input
                id="userId"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="UUID de l'utilisateur"
                required
              />
              <p className="text-xs text-muted-foreground">
                Pour le moment, vous devez entrer l'ID utilisateur (UUID) du membre à ajouter
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Rôle</Label>
              <Select value={role} onValueChange={(value: any) => setRole(value)}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gestionnaire">Gestionnaire</SelectItem>
                  <SelectItem value="proprietaire">Propriétaire</SelectItem>
                  <SelectItem value="locataire">Locataire</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                <strong>Gestionnaire:</strong> Gère les propriétés et les membres<br />
                <strong>Propriétaire:</strong> Possède les propriétés, peut valider<br />
                <strong>Locataire:</strong> Accès limité à ses baux
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Ajout..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
