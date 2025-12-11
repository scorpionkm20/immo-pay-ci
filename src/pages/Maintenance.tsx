import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateTicketDialog } from "@/components/CreateTicketDialog";
import { TicketCard } from "@/components/TicketCard";
import { useMaintenanceTickets, TicketStatus, TicketPriority } from "@/hooks/useMaintenanceTickets";
import { useLeases } from "@/hooks/useLeases";
import { useAuth } from "@/hooks/useAuth";
import { AlertCircle, Loader2, Filter } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Navbar } from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";

const Maintenance = () => {
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuth();
  const { leases, loading: leasesLoading } = useLeases(userRole);
  const [searchParams] = useSearchParams();
  const [selectedLeaseId, setSelectedLeaseId] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<TicketPriority | "all">("all");
  const { tickets, isLoading: ticketsLoading } = useMaintenanceTickets(
    selectedLeaseId === "all" ? undefined : selectedLeaseId
  );

  const isLocataire = userRole === "locataire";
  const isGestionnaire = userRole === "gestionnaire";

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Pre-select lease from URL params or first lease for locataire
  useEffect(() => {
    const leaseParam = searchParams.get("lease");
    if (leaseParam) {
      setSelectedLeaseId(leaseParam);
    } else if (isLocataire && leases && leases.length > 0 && selectedLeaseId === "all") {
      setSelectedLeaseId(leases[0].id);
    }
  }, [searchParams, leases, isLocataire, selectedLeaseId]);

  const filterTickets = (status: TicketStatus | "all") => {
    if (!tickets) return [];
    let filtered = tickets;
    
    // Filter by status
    if (status !== "all") {
      filtered = filtered.filter((ticket) => ticket.statut === status);
    }
    
    // Filter by priority
    if (selectedPriority !== "all") {
      filtered = filtered.filter((ticket) => ticket.priorite === selectedPriority);
    }
    
    return filtered;
  };

  const getTicketCounts = () => {
    if (!tickets) return { all: 0, ouvert: 0, en_cours: 0, resolu: 0, ferme: 0 };
    
    // Apply priority filter to counts
    const filteredByPriority = selectedPriority === "all" 
      ? tickets 
      : tickets.filter((t) => t.priorite === selectedPriority);
    
    return {
      all: filteredByPriority.length,
      ouvert: filteredByPriority.filter((t) => t.statut === "ouvert").length,
      en_cours: filteredByPriority.filter((t) => t.statut === "en_cours").length,
      resolu: filteredByPriority.filter((t) => t.statut === "resolu").length,
      ferme: filteredByPriority.filter((t) => t.statut === "ferme").length,
    };
  };

  const getPriorityCounts = () => {
    if (!tickets) return { urgente: 0, haute: 0, moyenne: 0, faible: 0 };
    return {
      urgente: tickets.filter((t) => t.priorite === "urgente").length,
      haute: tickets.filter((t) => t.priorite === "haute").length,
      moyenne: tickets.filter((t) => t.priorite === "moyenne").length,
      faible: tickets.filter((t) => t.priorite === "faible").length,
    };
  };

  const counts = getTicketCounts();
  const priorityCounts = getPriorityCounts();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const showCreateButton = isLocataire && selectedLeaseId && selectedLeaseId !== "all";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto p-6 space-y-6">
        <PageHeader
          title="Maintenance"
          backTo="/home"
          actions={showCreateButton && <CreateTicketDialog leaseId={selectedLeaseId} />}
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtres
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="lease">Bail</Label>
                {leasesLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Chargement des baux...
                  </div>
                ) : leases && leases.length > 0 ? (
                  <Select value={selectedLeaseId} onValueChange={setSelectedLeaseId}>
                    <SelectTrigger id="lease">
                      <SelectValue placeholder="Sélectionner un bail" />
                    </SelectTrigger>
                    <SelectContent>
                      {isGestionnaire && <SelectItem value="all">Tous les baux</SelectItem>}
                      {leases.map((lease) => (
                        <SelectItem key={lease.id} value={lease.id}>
                          Bail du {new Date(lease.date_debut).toLocaleDateString("fr-FR")} - {lease.montant_mensuel.toLocaleString("fr-FR")} FCFA/mois
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Aucun bail trouvé. {isLocataire ? "Vous n'avez pas encore de bail actif." : "Créez un bail pour voir les tickets de maintenance."}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priorité</Label>
                <Select value={selectedPriority} onValueChange={(v) => setSelectedPriority(v as TicketPriority | "all")}>
                  <SelectTrigger id="priority">
                    <SelectValue placeholder="Toutes les priorités" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les priorités</SelectItem>
                    <SelectItem value="urgente">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        Urgente ({priorityCounts.urgente})
                      </div>
                    </SelectItem>
                    <SelectItem value="haute">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-orange-500" />
                        Haute ({priorityCounts.haute})
                      </div>
                    </SelectItem>
                    <SelectItem value="moyenne">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                        Moyenne ({priorityCounts.moyenne})
                      </div>
                    </SelectItem>
                    <SelectItem value="faible">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-gray-500" />
                        Faible ({priorityCounts.faible})
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedPriority !== "all" && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Filtre actif:</span>
                <Badge 
                  variant="secondary" 
                  className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => setSelectedPriority("all")}
                >
                  Priorité: {selectedPriority} ✕
                </Badge>
              </div>
            )}
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
          {ticketsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
              <span className="text-muted-foreground">Chargement des tickets...</span>
            </div>
          ) : filterTickets("all").length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  {selectedPriority !== "all" 
                    ? `Aucun ticket avec priorité "${selectedPriority}"` 
                    : "Aucun ticket de maintenance"}
                </p>
                {isLocataire && selectedLeaseId && selectedLeaseId !== "all" && selectedPriority === "all" && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Créez un ticket pour signaler un problème
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            filterTickets("all").map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))
          )}
        </TabsContent>

        <TabsContent value="ouvert" className="space-y-4">
          {filterTickets("ouvert").length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  {selectedPriority !== "all" 
                    ? `Aucun ticket ouvert avec priorité "${selectedPriority}"` 
                    : "Aucun ticket ouvert"}
                </p>
              </CardContent>
            </Card>
          ) : (
            filterTickets("ouvert").map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))
          )}
        </TabsContent>

        <TabsContent value="en_cours" className="space-y-4">
          {filterTickets("en_cours").length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  {selectedPriority !== "all" 
                    ? `Aucun ticket en cours avec priorité "${selectedPriority}"` 
                    : "Aucun ticket en cours"}
                </p>
              </CardContent>
            </Card>
          ) : (
            filterTickets("en_cours").map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))
          )}
        </TabsContent>

        <TabsContent value="resolu" className="space-y-4">
          {filterTickets("resolu").length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  {selectedPriority !== "all" 
                    ? `Aucun ticket résolu avec priorité "${selectedPriority}"` 
                    : "Aucun ticket résolu"}
                </p>
              </CardContent>
            </Card>
          ) : (
            filterTickets("resolu").map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))
          )}
        </TabsContent>

        <TabsContent value="ferme" className="space-y-4">
          {filterTickets("ferme").length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  {selectedPriority !== "all" 
                    ? `Aucun ticket fermé avec priorité "${selectedPriority}"` 
                    : "Aucun ticket fermé"}
                </p>
              </CardContent>
            </Card>
          ) : (
            filterTickets("ferme").map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))
          )}
        </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Maintenance;
