import { Building2, Check, ChevronsUpDown, Plus, Copy, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";
import { useManagementSpaces } from "@/hooks/useManagementSpaces";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
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
import { Textarea } from "@/components/ui/textarea";
import { JoinSpaceDialog } from "./JoinSpaceDialog";
import { toast } from "sonner";

export const SpaceSelector = () => {
  const [open, setOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [invitationCode, setInvitationCode] = useState("");
  const [showInvitationCode, setShowInvitationCode] = useState(false);
  const { spaces, currentSpace, switchSpace, createSpace, loading, refetch } = useManagementSpaces();
  const { userRole } = useAuth();

  const handleCreateSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data } = await createSpace({ nom, description });
    if (data) {
      setInvitationCode(data.invitation_code || "");
      setShowInvitationCode(true);
      setNom("");
      setDescription("");
    }
  };

  const copyInvitationCode = () => {
    navigator.clipboard.writeText(invitationCode);
    toast.success("Code d'invitation copié!");
  };

  const handleCloseInvitationDialog = () => {
    setShowInvitationCode(false);
    setCreateDialogOpen(false);
    setInvitationCode("");
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Chargement...</span>
      </div>
    );
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="truncate">
                {currentSpace ? currentSpace.nom : "Sélectionner un espace"}
              </span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0">
          <Command>
            <CommandInput placeholder="Rechercher un espace..." />
            <CommandEmpty>Aucun espace trouvé.</CommandEmpty>
            <CommandGroup>
              {spaces.map((space) => (
                <CommandItem
                  key={space.id}
                  value={space.id}
                  onSelect={() => {
                    switchSpace(space);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      currentSpace?.id === space.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{space.nom}</span>
                    {space.description && (
                      <span className="text-xs text-muted-foreground truncate">
                        {space.description}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <div className="p-2 border-t space-y-1">
              {userRole !== 'locataire' && (
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => {
                    setOpen(false);
                    setCreateDialogOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Créer un nouvel espace
                </Button>
              )}
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  setOpen(false);
                  setJoinDialogOpen(true);
                }}
              >
                <LogIn className="mr-2 h-4 w-4" />
                Rejoindre un espace
              </Button>
            </div>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          {!showInvitationCode ? (
            <form onSubmit={handleCreateSpace}>
              <DialogHeader>
                <DialogTitle>Créer un espace de gestion</DialogTitle>
                <DialogDescription>
                  Créez un nouvel espace pour gérer vos propriétés et locataires
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom de l'espace</Label>
                  <Input
                    id="nom"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    placeholder="Ex: Agence Immo Yopougon"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optionnel)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description de votre espace..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit">Créer l'espace</Button>
              </DialogFooter>
            </form>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Espace créé avec succès!</DialogTitle>
                <DialogDescription>
                  Partagez ce code d'invitation pour inviter des membres
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Code d'invitation</Label>
                  <div className="flex gap-2">
                    <Input
                      value={invitationCode}
                      readOnly
                      className="font-mono text-lg tracking-wider"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={copyInvitationCode}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Les membres pourront rejoindre votre espace en utilisant ce code
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCloseInvitationDialog}>Terminé</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <JoinSpaceDialog
        open={joinDialogOpen}
        onOpenChange={setJoinDialogOpen}
        onSuccess={refetch}
      />
    </>
  );
};
