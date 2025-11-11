import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MessageSquarePlus, Search } from 'lucide-react';
import { useConversations } from '@/hooks/useConversations';
import { useProperties } from '@/hooks/useProperties';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const NewConversationDialog = () => {
  const navigate = useNavigate();
  const { createOrGetConversation } = useConversations();
  const { properties } = useProperties();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchPhone, setSearchPhone] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [foundUser, setFoundUser] = useState<{
    id: string;
    full_name: string;
    phone: string;
  } | null>(null);

  const handleSearchUser = async () => {
    if (!searchPhone.trim()) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Veuillez entrer un numéro de téléphone"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone')
        .eq('phone', searchPhone.trim())
        .single();

      if (error || !data) {
        toast({
          variant: "destructive",
          title: "Utilisateur non trouvé",
          description: "Aucun utilisateur avec ce numéro de téléphone"
        });
        setFoundUser(null);
        return;
      }

      setFoundUser({
        id: data.user_id,
        full_name: data.full_name,
        phone: data.phone
      });

      toast({
        title: "Utilisateur trouvé",
        description: `${data.full_name} - ${data.phone}`
      });
    } catch (error) {
      console.error('Error searching user:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de rechercher l'utilisateur"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartConversation = async () => {
    if (!foundUser || !selectedPropertyId) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Veuillez sélectionner un utilisateur et une propriété"
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Vous devez être connecté"
        });
        return;
      }

      // Get property to determine gestionnaire_id
      const property = properties?.find(p => p.id === selectedPropertyId);
      if (!property) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Propriété non trouvée"
        });
        return;
      }

      const { data, error } = await createOrGetConversation(
        selectedPropertyId,
        user.id,
        property.gestionnaire_id
      );

      if (error || !data) {
        throw new Error('Impossible de créer la conversation');
      }

      setOpen(false);
      navigate(`/messages?conversation=${data.id}`);
      
      // Reset form
      setSearchPhone('');
      setSelectedPropertyId('');
      setFoundUser(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <MessageSquarePlus className="h-4 w-4 mr-2" />
          Nouvelle conversation
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Démarrer une conversation</DialogTitle>
          <DialogDescription>
            Recherchez un utilisateur par son numéro de téléphone et sélectionnez une propriété
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Recherche par numéro de téléphone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Numéro de téléphone</Label>
            <div className="flex gap-2">
              <Input
                id="phone"
                placeholder="+225 XX XX XX XX XX"
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                disabled={loading}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleSearchUser}
                disabled={loading || !searchPhone.trim()}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Utilisateur trouvé */}
          {foundUser && (
            <div className="p-3 bg-accent rounded-md">
              <p className="font-semibold">{foundUser.full_name}</p>
              <p className="text-sm text-muted-foreground">{foundUser.phone}</p>
            </div>
          )}

          {/* Sélection de propriété */}
          {foundUser && (
            <div className="space-y-2">
              <Label htmlFor="property">Propriété concernée</Label>
              <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                <SelectTrigger id="property">
                  <SelectValue placeholder="Sélectionner une propriété" />
                </SelectTrigger>
                <SelectContent>
                  {properties?.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.titre} - {property.ville}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Bouton de démarrage */}
          {foundUser && selectedPropertyId && (
            <Button
              onClick={handleStartConversation}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Création...' : 'Démarrer la conversation'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
