import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { MaintenanceTicket, TicketStatus, useMaintenanceTickets, useMaintenanceInterventions } from "@/hooks/useMaintenanceTickets";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";

interface TicketCardProps {
  ticket: MaintenanceTicket;
}

const getStatusIcon = (status: TicketStatus) => {
  switch (status) {
    case "ouvert":
      return <AlertCircle className="h-4 w-4" />;
    case "en_cours":
      return <Clock className="h-4 w-4" />;
    case "resolu":
      return <CheckCircle className="h-4 w-4" />;
    case "ferme":
      return <XCircle className="h-4 w-4" />;
  }
};

const getStatusColor = (status: TicketStatus) => {
  switch (status) {
    case "ouvert":
      return "bg-yellow-500";
    case "en_cours":
      return "bg-blue-500";
    case "resolu":
      return "bg-green-500";
    case "ferme":
      return "bg-gray-500";
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "faible":
      return "bg-gray-500";
    case "moyenne":
      return "bg-blue-500";
    case "haute":
      return "bg-orange-500";
    case "urgente":
      return "bg-red-500";
  }
};

export const TicketCard = ({ ticket }: TicketCardProps) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<TicketStatus>(ticket.statut);
  const [interventionDescription, setInterventionDescription] = useState("");
  const { user, userRole } = useAuth();
  const { updateTicketStatus } = useMaintenanceTickets();
  const { interventions } = useMaintenanceInterventions(ticket.id);

  const isGestionnaire = userRole === "gestionnaire";

  const handleUpdateStatus = async () => {
    await updateTicketStatus.mutateAsync({
      ticketId: ticket.id,
      statut: newStatus,
      interventionDescription,
    });
    setShowUpdateDialog(false);
    setInterventionDescription("");
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">{ticket.titre}</CardTitle>
              <div className="flex gap-2">
                <Badge className={getStatusColor(ticket.statut)}>
                  {getStatusIcon(ticket.statut)}
                  <span className="ml-1">{ticket.statut}</span>
                </Badge>
                <Badge className={getPriorityColor(ticket.priorite)}>
                  {ticket.priorite}
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? <ChevronUp /> : <ChevronDown />}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-2">{ticket.description}</p>
          <p className="text-xs text-muted-foreground">
            Créé le {format(new Date(ticket.created_at), "d MMMM yyyy", { locale: fr })}
          </p>

          {showDetails && (
            <div className="mt-4 space-y-4">
              {ticket.photos && ticket.photos.length > 0 && (
                <div>
                  <Label className="text-sm font-semibold">Photos</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {ticket.photos.map((photo, index) => (
                      <img
                        key={index}
                        src={photo}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-24 object-cover rounded-md"
                      />
                    ))}
                  </div>
                </div>
              )}

              {interventions && interventions.length > 0 && (
                <div>
                  <Label className="text-sm font-semibold">Historique des interventions</Label>
                  <div className="space-y-2 mt-2">
                    {interventions.map((intervention) => (
                      <div key={intervention.id} className="border-l-2 border-primary pl-3 py-2">
                        <p className="text-sm">{intervention.description}</p>
                        {intervention.statut_avant && intervention.statut_apres && (
                          <p className="text-xs text-muted-foreground">
                            Statut: {intervention.statut_avant} → {intervention.statut_apres}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(intervention.created_at), "d MMM yyyy à HH:mm", { locale: fr })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isGestionnaire && (
                <Button onClick={() => setShowUpdateDialog(true)} className="w-full">
                  Mettre à jour le statut
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mettre à jour le ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status">Nouveau statut</Label>
              <Select value={newStatus} onValueChange={(value) => setNewStatus(value as TicketStatus)}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ouvert">Ouvert</SelectItem>
                  <SelectItem value="en_cours">En cours</SelectItem>
                  <SelectItem value="resolu">Résolu</SelectItem>
                  <SelectItem value="ferme">Fermé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="intervention">Description de l'intervention</Label>
              <Textarea
                id="intervention"
                value={interventionDescription}
                onChange={(e) => setInterventionDescription(e.target.value)}
                placeholder="Décrivez l'intervention effectuée..."
                rows={4}
                required
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowUpdateDialog(false)}>
                Annuler
              </Button>
              <Button onClick={handleUpdateStatus} disabled={!interventionDescription || updateTicketStatus.isPending}>
                {updateTicketStatus.isPending ? "Mise à jour..." : "Mettre à jour"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
