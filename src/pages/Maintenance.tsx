import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateTicketDialog } from "@/components/CreateTicketDialog";
import { TicketCard } from "@/components/TicketCard";
import { useMaintenanceTickets, TicketStatus } from "@/hooks/useMaintenanceTickets";
import { useLeases } from "@/hooks/useLeases";
import { useAuth } from "@/hooks/useAuth";
import { AlertCircle } from "lucide-react";

const Maintenance = () => {
  const { user, userRole } = useAuth();
  const { leases } = useLeases();
  const [searchParams] = useSearchParams();
  const [selectedLeaseId, setSelectedLeaseId] = useState<string>("");
  const { tickets, isLoading } = useMaintenanceTickets(selectedLeaseId || undefined);

  const isLocataire = userRole === "locataire";

  // Pre-select lease from URL params
  useEffect(() => {
    const leaseParam = searchParams.get("lease");
    if (leaseParam) {
      setSelectedLeaseId(leaseParam);
    }
  }, [searchParams]);

  const filterTicketsByStatus = (status: TicketStatus | "all") => {
    if (!tickets) return [];
    if (status === "all") return tickets;
    return tickets.filter((ticket) => ticket.statut === status);
  };

  const getTicketCounts = () => {
    if (!tickets) return { all: 0, ouvert: 0, en_cours: 0, resolu: 0, ferme: 0 };
    return {
      all: tickets.length,
      ouvert: tickets.filter((t) => t.statut === "ouvert").length,
      en_cours: tickets.filter((t) => t.statut === "en_cours").length,
      resolu: tickets.filter((t) => t.statut === "resolu").length,
      ferme: tickets.filter((t) => t.statut === "ferme").length,
    };
  };

  const counts = getTicketCounts();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Maintenance</h1>
        {isLocataire && selectedLeaseId && (
          <CreateTicketDialog leaseId={selectedLeaseId} />
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtrer par bail</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="lease">Sélectionner un bail</Label>
            <Select value={selectedLeaseId} onValueChange={setSelectedLeaseId}>
              <SelectTrigger id="lease">
                <SelectValue placeholder="Tous les baux" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les baux</SelectItem>
                {leases?.map((lease) => (
                  <SelectItem key={lease.id} value={lease.id}>
                    Bail du {new Date(lease.date_debut).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">
            Tous ({counts.all})
          </TabsTrigger>
          <TabsTrigger value="ouvert">
            Ouverts ({counts.ouvert})
          </TabsTrigger>
          <TabsTrigger value="en_cours">
            En cours ({counts.en_cours})
          </TabsTrigger>
          <TabsTrigger value="resolu">
            Résolus ({counts.resolu})
          </TabsTrigger>
          <TabsTrigger value="ferme">
            Fermés ({counts.ferme})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {isLoading ? (
            <p className="text-center text-muted-foreground">Chargement...</p>
          ) : filterTicketsByStatus("all").length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  Aucun ticket de maintenance
                </p>
              </CardContent>
            </Card>
          ) : (
            filterTicketsByStatus("all").map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))
          )}
        </TabsContent>

        <TabsContent value="ouvert" className="space-y-4">
          {filterTicketsByStatus("ouvert").length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  Aucun ticket ouvert
                </p>
              </CardContent>
            </Card>
          ) : (
            filterTicketsByStatus("ouvert").map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))
          )}
        </TabsContent>

        <TabsContent value="en_cours" className="space-y-4">
          {filterTicketsByStatus("en_cours").length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  Aucun ticket en cours
                </p>
              </CardContent>
            </Card>
          ) : (
            filterTicketsByStatus("en_cours").map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))
          )}
        </TabsContent>

        <TabsContent value="resolu" className="space-y-4">
          {filterTicketsByStatus("resolu").length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  Aucun ticket résolu
                </p>
              </CardContent>
            </Card>
          ) : (
            filterTicketsByStatus("resolu").map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))
          )}
        </TabsContent>

        <TabsContent value="ferme" className="space-y-4">
          {filterTicketsByStatus("ferme").length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  Aucun ticket fermé
                </p>
              </CardContent>
            </Card>
          ) : (
            filterTicketsByStatus("ferme").map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Maintenance;
