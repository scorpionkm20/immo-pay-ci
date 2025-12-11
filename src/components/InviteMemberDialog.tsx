import { useState } from "react";
import { useSpaceInvitations } from "@/hooks/useSpaceInvitations";
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
import { toast } from "sonner";
import { Copy, Check, Mail, UserPlus, Send, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaceId: string;
  onMemberAdded?: () => void;
}

const roleDescriptions = {
  locataire: "Peut voir ses baux, payer son loyer et créer des tickets",
  proprietaire: "Peut voir et valider les propriétés qu'il possède",
  gestionnaire: "Accès complet : gérer les propriétés, baux et membres",
};

export const InviteMemberDialog = ({
  open,
  onOpenChange,
  spaceId,
  onMemberAdded,
}: InviteMemberDialogProps) => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<'gestionnaire' | 'proprietaire' | 'locataire'>('locataire');
  const [loading, setLoading] = useState(false);
  const [invitationLink, setInvitationLink] = useState("");
  const [copied, setCopied] = useState(false);
  const { createInvitation } = useSpaceInvitations(spaceId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error("Veuillez entrer une adresse email");
      return;
    }

    setLoading(true);

    try {
      const token = await createInvitation(email.trim(), role);
      
      if (token) {
        const baseUrl = window.location.origin;
        const link = `${baseUrl}/accept-invitation?token=${token}`;
        setInvitationLink(link);
        
        if (onMemberAdded) {
          onMemberAdded();
        }
      }
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error(error.message || 'Erreur lors de la création de l\'invitation');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(invitationLink);
      setCopied(true);
      toast.success('Lien copié dans le presse-papiers');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Impossible de copier le lien');
    }
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent("Invitation à rejoindre un espace de gestion");
    const body = encodeURIComponent(
      `Bonjour,\n\nVous êtes invité(e) à rejoindre un espace de gestion immobilière.\n\nCliquez sur ce lien pour accepter l'invitation :\n${invitationLink}\n\nCe lien expire dans 7 jours.`
    );
    window.open(`mailto:${email}?subject=${subject}&body=${body}`);
  };

  const shareViaWhatsApp = () => {
    const message = encodeURIComponent(
      `Bonjour ! Vous êtes invité(e) à rejoindre un espace de gestion immobilière. Cliquez ici pour accepter : ${invitationLink}`
    );
    window.open(`https://wa.me/?text=${message}`);
  };

  const handleClose = () => {
    setEmail("");
    setRole('locataire');
    setInvitationLink("");
    setCopied(false);
    onOpenChange(false);
  };

  const handleNewInvitation = () => {
    setEmail("");
    setRole('locataire');
    setInvitationLink("");
    setCopied(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {invitationLink ? "Invitation créée" : "Inviter un membre"}
          </DialogTitle>
          <DialogDescription>
            {invitationLink ? 
              "Partagez ce lien avec la personne que vous souhaitez inviter." :
              "Envoyez une invitation pour ajouter un nouveau membre à votre espace."
            }
          </DialogDescription>
        </DialogHeader>
        
        {!invitationLink ? (
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Adresse email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="exemple@email.com"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Rôle attribué</Label>
                <Select value={role} onValueChange={(value: any) => setRole(value)}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Sélectionnez un rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="locataire">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Locataire</Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="proprietaire">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Propriétaire</Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="gestionnaire">
                      <div className="flex items-center gap-2">
                        <Badge variant="default">Gestionnaire</Badge>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {roleDescriptions[role]}
                </p>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>Création...</>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Créer l'invitation
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted/50 rounded-lg border border-dashed">
              <Label className="text-sm font-medium">Lien d'invitation</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={invitationLink}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                  className="shrink-0"
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Ce lien expire dans 7 jours et ne peut être utilisé qu'une fois.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Partager via</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={shareViaEmail}
                  className="w-full"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={shareViaWhatsApp}
                  className="w-full"
                >
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp
                </Button>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={handleNewInvitation}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Nouvelle invitation
              </Button>
              <Button onClick={handleClose}>
                Terminé
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
