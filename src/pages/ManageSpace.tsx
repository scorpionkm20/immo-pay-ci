import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useManagementSpaces } from "@/hooks/useManagementSpaces";
import { useSpaceInvitations } from "@/hooks/useSpaceInvitations";
import { Building2, Trash2, UserPlus, Settings, Users, Mail, Clock, Copy, Check, Home, Loader2, RefreshCw, CheckCircle2, XCircle, History, RotateCcw, FileDown } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { Navbar } from "@/components/Navbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { InviteMemberDialog } from "@/components/InviteMemberDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface SpaceMemberWithProfile {
  id: string;
  space_id: string;
  user_id: string;
  role: 'gestionnaire' | 'proprietaire' | 'locataire';
  created_at: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
}

export default function ManageSpace() {
  const navigate = useNavigate();
  const { currentSpace, fetchSpaceMembers, removeMember } = useManagementSpaces();
  const { invitations, deleteInvitation, resendInvitation, refreshInvitations, loading: invitationsLoading } = useSpaceInvitations(currentSpace?.id);
  const { user } = useAuth();
  const [members, setMembers] = useState<SpaceMemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  const handleExportPDF = async () => {
    if (!currentSpace) return;
    
    setGeneratingReport(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Vous devez être connecté');
        return;
      }

      const response = await supabase.functions.invoke('generate-space-report', {
        body: { spaceId: currentSpace.id },
      });

      if (response.error) throw response.error;
      if (!response.data?.success) throw new Error(response.data?.error || 'Erreur inconnue');

      // Ouvrir le rapport dans un nouvel onglet pour impression/PDF
      const reportWindow = window.open('', '_blank');
      if (reportWindow) {
        reportWindow.document.write(response.data.html);
        reportWindow.document.close();
        toast.success('Rapport généré - Utilisez Ctrl+P pour imprimer en PDF');
      } else {
        toast.error('Impossible d\'ouvrir le rapport. Vérifiez les bloqueurs de popups.');
      }
    } catch (error: any) {
      console.error('Erreur génération rapport:', error);
      toast.error(error.message || 'Impossible de générer le rapport');
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    setResendingId(invitationId);
    const newToken = await resendInvitation(invitationId);
    setResendingId(null);
    if (newToken) {
      // Copier automatiquement le nouveau lien
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/accept-invitation?token=${newToken}`;
      try {
        await navigator.clipboard.writeText(link);
        setCopiedToken(newToken);
        toast.success("Invitation renvoyée et lien copié !");
        setTimeout(() => setCopiedToken(null), 2000);
      } catch (err) {
        // Le lien n'a pas pu être copié mais l'invitation a été renvoyée
      }
    }
  };

  const loadMembers = async () => {
    if (!currentSpace) return;
    
    setLoading(true);
    const { data } = await fetchSpaceMembers(currentSpace.id);
    if (data) {
      setMembers(data as SpaceMemberWithProfile[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadMembers();
  }, [currentSpace]);

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    
    const { error } = await removeMember(memberToRemove);
    if (!error) {
      loadMembers();
      toast.success("Membre retiré avec succès");
    }
    setMemberToRemove(null);
  };

  const handleRefresh = () => {
    loadMembers();
    refreshInvitations();
    toast.success("Données actualisées");
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'gestionnaire':
        return 'default';
      case 'proprietaire':
        return 'secondary';
      case 'locataire':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'gestionnaire':
        return 'Gestionnaire';
      case 'proprietaire':
        return 'Propriétaire';
      case 'locataire':
        return 'Locataire';
      default:
        return role;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const copyInvitationLink = async (token: string) => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/accept-invitation?token=${token}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedToken(token);
      toast.success("Lien copié");
      setTimeout(() => setCopiedToken(null), 2000);
    } catch (err) {
      toast.error("Impossible de copier le lien");
    }
  };

  const pendingInvitations = invitations.filter(inv => !inv.accepted && new Date(inv.expires_at) > new Date());
  const acceptedInvitations = invitations.filter(inv => inv.accepted);
  const expiredInvitations = invitations.filter(inv => !inv.accepted && new Date(inv.expires_at) <= new Date());

  const getInvitationStatus = (invitation: typeof invitations[0]) => {
    if (invitation.accepted) {
      return { label: 'Acceptée', variant: 'default' as const, icon: CheckCircle2, color: 'text-green-500' };
    }
    if (new Date(invitation.expires_at) <= new Date()) {
      return { label: 'Expirée', variant: 'destructive' as const, icon: XCircle, color: 'text-destructive' };
    }
    return { label: 'En attente', variant: 'secondary' as const, icon: Clock, color: 'text-orange-500' };
  };

  if (!currentSpace) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Aucun espace sélectionné
              </CardTitle>
              <CardDescription>
                Veuillez sélectionner un espace de gestion pour continuer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/dashboard')}>
                Retour au tableau de bord
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <PageHeader
            title={currentSpace.nom}
            description={currentSpace.description || "Gérez les membres de votre espace"}
            backTo="/dashboard"
            actions={
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleExportPDF}
                  disabled={generatingReport}
                >
                  {generatingReport ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <FileDown className="h-4 w-4 mr-2" />
                  )}
                  Exporter PDF
                </Button>
                <Button variant="outline" size="icon" onClick={handleRefresh}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button onClick={() => setInviteDialogOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Inviter un membre
                </Button>
              </div>
            }
          />

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{members.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gestionnaires</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {members.filter(m => m.role === 'gestionnaire').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Propriétaires</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {members.filter(m => m.role === 'proprietaire').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Locataires</CardTitle>
                <Home className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {members.filter(m => m.role === 'locataire').length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pending Invitations */}
          {pendingInvitations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Invitations en attente ({pendingInvitations.length})
                </CardTitle>
                <CardDescription>
                  Ces personnes n'ont pas encore accepté leur invitation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pendingInvitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>{invitation.email[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{invitation.email}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant={getRoleBadgeVariant(invitation.role)} className="text-xs">
                              {getRoleLabel(invitation.role)}
                            </Badge>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Expire le {new Date(invitation.expires_at).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyInvitationLink(invitation.token)}
                        >
                          {copiedToken === invitation.token ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteInvitation(invitation.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
          </Card>
          )}

          {/* Invitation History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Historique des invitations
              </CardTitle>
              <CardDescription>
                Toutes les invitations envoyées et leur statut actuel
              </CardDescription>
            </CardHeader>
            <CardContent>
              {invitationsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-1/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : invitations.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">Aucune invitation envoyée</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Rôle</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date d'envoi</TableHead>
                      <TableHead>Expiration / Acceptation</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations.map((invitation) => {
                      const status = getInvitationStatus(invitation);
                      const StatusIcon = status.icon;
                      return (
                        <TableRow key={invitation.id}>
                          <TableCell className="font-medium">{invitation.email}</TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(invitation.role)}>
                              {getRoleLabel(invitation.role)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <StatusIcon className={`h-4 w-4 ${status.color}`} />
                              <Badge variant={status.variant}>{status.label}</Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(invitation.created_at), 'dd MMM yyyy', { locale: fr })}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {invitation.accepted && invitation.accepted_at ? (
                              <span className="text-green-600">
                                Acceptée le {format(new Date(invitation.accepted_at), 'dd MMM yyyy', { locale: fr })}
                              </span>
                            ) : (
                              <span className={new Date(invitation.expires_at) <= new Date() ? 'text-destructive' : ''}>
                                {format(new Date(invitation.expires_at), 'dd MMM yyyy', { locale: fr })}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {/* Bouton renvoyer pour les invitations expirées */}
                              {!invitation.accepted && new Date(invitation.expires_at) <= new Date() && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleResendInvitation(invitation.id)}
                                  disabled={resendingId === invitation.id}
                                  className="gap-1"
                                >
                                  {resendingId === invitation.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <RotateCcw className="h-4 w-4" />
                                  )}
                                  <span className="hidden sm:inline">Renvoyer</span>
                                </Button>
                              )}
                              {/* Bouton copier pour les invitations en attente */}
                              {!invitation.accepted && new Date(invitation.expires_at) > new Date() && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => copyInvitationLink(invitation.token)}
                                >
                                  {copiedToken === invitation.token ? (
                                    <Check className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteInvitation(invitation.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
              
              {/* Summary */}
              {invitations.length > 0 && (
                <div className="flex gap-4 mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                    <span>{acceptedInvitations.length} acceptée(s)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-3 w-3 rounded-full bg-orange-500" />
                    <span>{pendingInvitations.length} en attente</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-3 w-3 rounded-full bg-destructive" />
                    <span>{expiredInvitations.length} expirée(s)</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>



          {/* Members Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Membres de l'espace
              </CardTitle>
              <CardDescription>
                Gérez les membres et leurs rôles dans cet espace de gestion
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-1/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : members.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="font-semibold text-lg mb-2">Aucun membre</h3>
                  <p className="text-muted-foreground mb-4">
                    Commencez par inviter des membres à rejoindre votre espace
                  </p>
                  <Button onClick={() => setInviteDialogOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Inviter le premier membre
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.profiles?.avatar_url || undefined} />
                          <AvatarFallback>
                            {getInitials(member.profiles?.full_name || 'U')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {member.profiles?.full_name || 'Sans nom'}
                            {member.user_id === user?.id && (
                              <Badge variant="outline" className="ml-2 text-xs">Vous</Badge>
                            )}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant={getRoleBadgeVariant(member.role)}>
                              {getRoleLabel(member.role)}
                            </Badge>
                            <span>
                              Depuis le {new Date(member.created_at).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                        </div>
                      </div>
                      {member.user_id !== user?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setMemberToRemove(member.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Invite Dialog */}
        <InviteMemberDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
          spaceId={currentSpace.id}
          onMemberAdded={() => {
            loadMembers();
            refreshInvitations();
          }}
        />

        {/* Remove Member Confirmation */}
        <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Retirer ce membre ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action retirera le membre de l'espace. Il n'aura plus accès aux données
                de cet espace de gestion.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleRemoveMember} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Retirer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
