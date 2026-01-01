import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ArrowRightLeft, CheckCircle, Clock, XCircle, Eye } from "lucide-react";
import { usePaymentDistributions, PaymentDistribution, useUpdateDistributionStatus } from "@/hooks/usePaymentDistribution";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";

interface PaymentDistributionHistoryProps {
  spaceId: string;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'reussi':
      return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Réussi</Badge>;
    case 'en_cours':
      return <Badge className="bg-blue-500"><Clock className="h-3 w-3 mr-1" /> En cours</Badge>;
    case 'echoue':
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Échoué</Badge>;
    case 'non_applicable':
      return <Badge variant="secondary">N/A</Badge>;
    default:
      return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" /> En attente</Badge>;
  }
};

const DistributionDetailDialog = ({ distribution }: { distribution: PaymentDistribution }) => {
  const [open, setOpen] = useState(false);
  const { mutate: updateStatus, isPending } = useUpdateDistributionStatus();

  const handleMarkAsSent = (recipient: 'proprietaire' | 'gestionnaire' | 'demarcheur') => {
    updateStatus({
      distributionId: distribution.id,
      recipient,
      status: 'reussi',
      transactionId: `MANUAL-${Date.now()}`
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Détails de la distribution</DialogTitle>
          <DialogDescription>
            {distribution.type_distribution === 'caution' ? 'Distribution de la caution' : 'Distribution du loyer'} - {formatCurrency(distribution.montant_total)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {distribution.type_distribution === 'caution' && distribution.detail_caution && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <h4 className="font-medium">Détail de la caution (5 mois)</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span>2 mois d'avance:</span>
                <span className="font-medium">{formatCurrency(distribution.detail_caution.avance_2_mois)}</span>
                <span className="pl-4">→ Part propriétaire:</span>
                <span>{formatCurrency(distribution.detail_caution.part_proprietaire_avance)}</span>
                <span className="pl-4">→ Part gestionnaire:</span>
                <span>{formatCurrency(distribution.detail_caution.part_gestionnaire_avance)}</span>
                <span>2 mois de garantie:</span>
                <span className="font-medium">{formatCurrency(distribution.detail_caution.garantie_2_mois)}</span>
                <span>1 mois démarcheur:</span>
                <span className="font-medium">{formatCurrency(distribution.detail_caution.demarcheur_1_mois)}</span>
              </div>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bénéficiaire</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Propriétaire</TableCell>
                <TableCell>{formatCurrency(distribution.montant_proprietaire)}</TableCell>
                <TableCell>{distribution.telephone_proprietaire || '-'}</TableCell>
                <TableCell>{getStatusBadge(distribution.statut_proprietaire)}</TableCell>
                <TableCell>
                  {distribution.statut_proprietaire === 'en_attente' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleMarkAsSent('proprietaire')}
                      disabled={isPending}
                    >
                      Marquer envoyé
                    </Button>
                  )}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Gestionnaire</TableCell>
                <TableCell>{formatCurrency(distribution.montant_gestionnaire)}</TableCell>
                <TableCell>{distribution.telephone_gestionnaire || '-'}</TableCell>
                <TableCell>{getStatusBadge(distribution.statut_gestionnaire)}</TableCell>
                <TableCell>
                  {distribution.statut_gestionnaire === 'en_attente' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleMarkAsSent('gestionnaire')}
                      disabled={isPending}
                    >
                      Marquer envoyé
                    </Button>
                  )}
                </TableCell>
              </TableRow>
              {distribution.type_distribution === 'caution' && (
                <TableRow>
                  <TableCell className="font-medium">Démarcheur</TableCell>
                  <TableCell>{formatCurrency(distribution.montant_demarcheur || 0)}</TableCell>
                  <TableCell>{distribution.telephone_demarcheur || '-'}</TableCell>
                  <TableCell>{getStatusBadge(distribution.statut_demarcheur || 'non_applicable')}</TableCell>
                  <TableCell>
                    {distribution.statut_demarcheur === 'en_attente' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleMarkAsSent('demarcheur')}
                        disabled={isPending}
                      >
                        Marquer envoyé
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const PaymentDistributionHistory = ({ spaceId }: PaymentDistributionHistoryProps) => {
  const { data: distributions, isLoading } = usePaymentDistributions(spaceId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5" />
          Historique des distributions
        </CardTitle>
        <CardDescription>
          Suivi des transferts vers les différents bénéficiaires
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!distributions || distributions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucune distribution enregistrée
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Montant total</TableHead>
                <TableHead>Propriétaire</TableHead>
                <TableHead>Gestionnaire</TableHead>
                <TableHead>Démarcheur</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {distributions.map((dist) => (
                <TableRow key={dist.id}>
                  <TableCell>
                    {format(new Date(dist.created_at), 'dd MMM yyyy', { locale: fr })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={dist.type_distribution === 'caution' ? 'default' : 'secondary'}>
                      {dist.type_distribution === 'caution' ? 'Caution' : 'Loyer'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{formatCurrency(dist.montant_total)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm">{formatCurrency(dist.montant_proprietaire)}</span>
                      {getStatusBadge(dist.statut_proprietaire)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm">{formatCurrency(dist.montant_gestionnaire)}</span>
                      {getStatusBadge(dist.statut_gestionnaire)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {dist.type_distribution === 'caution' ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-sm">{formatCurrency(dist.montant_demarcheur || 0)}</span>
                        {getStatusBadge(dist.statut_demarcheur || 'non_applicable')}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DistributionDetailDialog distribution={dist} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
