import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDocuments } from '@/hooks/useDocuments';
import { useLeases } from '@/hooks/useLeases';
import { useAuth } from '@/hooks/useAuth';
import { DocumentUpload } from '@/components/DocumentUpload';
import { SignatureCanvas } from '@/components/SignatureCanvas';
import { DocumentVersionHistory } from '@/components/DocumentVersionHistory';
import { GenerateContractDialog } from '@/components/GenerateContractDialog';
import { PageHeader } from '@/components/PageHeader';
import { FileText, Download, Trash2, PenTool, CheckCircle, Filter, Clock, Upload } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const Documents = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const leaseIdParam = searchParams.get('lease');
  
  const [selectedLeaseId, setSelectedLeaseId] = useState<string>(leaseIdParam || '');
  const [showUpload, setShowUpload] = useState(false);
  const [signingDocument, setSigningDocument] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [viewingHistory, setViewingHistory] = useState<string | null>(null);
  const [generatingContract, setGeneratingContract] = useState(false);
  
  const { user, userRole } = useAuth();
  const { leases, loading: leasesLoading } = useLeases();
  const { documents, loading, uploadDocument, signDocument, deleteDocument, refetch } = useDocuments(selectedLeaseId);

  useEffect(() => {
    if (leaseIdParam) {
      setSelectedLeaseId(leaseIdParam);
    }
  }, [leaseIdParam]);

  const userLeases = leases.filter(lease => 
    lease.locataire_id === user?.id || lease.gestionnaire_id === user?.id
  );

  const handleSignature = async (dataUrl: string) => {
    if (!signingDocument) return;
    await signDocument(signingDocument, dataUrl);
    setSigningDocument(null);
  };

  const getDocumentTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      bail: 'Bail',
      quittance: 'Quittance',
      etat_lieux: 'État des lieux',
      autre: 'Autre'
    };
    return types[type] || type;
  };

  const getDocumentTypeBadge = (type: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      bail: 'default',
      quittance: 'secondary',
      etat_lieux: 'outline',
      autre: 'secondary'
    };
    return variants[type] || 'secondary';
  };

  const filteredDocuments = filterType === 'all' 
    ? documents 
    : documents.filter(doc => doc.type_document === filterType);

  const signedDocuments = filteredDocuments.filter(doc => doc.signe);
  const unsignedDocuments = filteredDocuments.filter(doc => !doc.signe);

  if (leasesLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center text-muted-foreground">Chargement...</div>
        </div>
      </div>
    );
  }

  if (signingDocument) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <SignatureCanvas
            onSave={handleSignature}
            onCancel={() => setSigningDocument(null)}
          />
        </div>
      </div>
    );
  }

  const DocumentCard = ({ doc }: { doc: any }) => (
    <Card key={doc.id} className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-2">{doc.titre}</CardTitle>
            <Badge variant={getDocumentTypeBadge(doc.type_document)}>
              {getDocumentTypeLabel(doc.type_document)}
            </Badge>
          </div>
          {doc.signe && (
            <CheckCircle className="h-6 w-6 text-green-600" />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground space-y-1">
          <p className="font-medium">{doc.file_name}</p>
          <p>{(doc.file_size / 1024 / 1024).toFixed(2)} MB</p>
          <p>Ajouté le {format(new Date(doc.created_at), 'PPp', { locale: fr })}</p>
          {doc.signe && doc.date_signature && (
            <p className="text-green-600 font-medium">
              ✓ Signé le {format(new Date(doc.date_signature), 'PPp', { locale: fr })}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewingHistory(doc.id)}
          >
            <Clock className="h-4 w-4 mr-2" />
            Historique
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => window.open(doc.file_url, '_blank')}
          >
            <Download className="h-4 w-4 mr-2" />
            Télécharger
          </Button>
          
          {!doc.signe && userRole === 'locataire' && (
            <Button
              size="sm"
              className="flex-1"
              onClick={() => setSigningDocument(doc.id)}
            >
              <PenTool className="h-4 w-4 mr-2" />
              Signer
            </Button>
          )}

          {userRole === 'gestionnaire' && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm('Supprimer ce document ?')) {
                  const path = doc.file_url.split('/documents/')[1];
                  deleteDocument(doc.id, path);
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Documents Numériques"
          backTo="/dashboard"
          actions={
            userRole === 'gestionnaire' && selectedLeaseId && !showUpload && (
              <>
                <Button variant="secondary" onClick={() => setGeneratingContract(true)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Générer contrat PDF
                </Button>
                <Button onClick={() => setShowUpload(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Ajouter un document
                </Button>
              </>
            )
          }
        />

        {/* Lease Selector */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Sélectionner un bail</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedLeaseId} onValueChange={setSelectedLeaseId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisissez un bail" />
              </SelectTrigger>
              <SelectContent>
                {userLeases.map((lease) => (
                  <SelectItem key={lease.id} value={lease.id}>
                    Bail - {lease.montant_mensuel.toLocaleString()} FCFA/mois - 
                    {format(new Date(lease.date_debut), 'PP', { locale: fr })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Upload Form */}
        {showUpload && selectedLeaseId && (
          <div className="mb-6">
            <DocumentUpload
              leaseId={selectedLeaseId}
              onUpload={uploadDocument}
              onCancel={() => setShowUpload(false)}
            />
          </div>
        )}

        {/* Documents List */}
        {selectedLeaseId ? (
          loading ? (
            <div className="text-center text-muted-foreground">Chargement des documents...</div>
          ) : documents.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  Aucun document pour ce bail
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Filter */}
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Filtrer par type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les documents</SelectItem>
                        <SelectItem value="bail">Baux</SelectItem>
                        <SelectItem value="quittance">Quittances</SelectItem>
                        <SelectItem value="etat_lieux">États des lieux</SelectItem>
                        <SelectItem value="autre">Autres</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="text-sm text-muted-foreground">
                      {filteredDocuments.length} document(s)
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tabs for signed/unsigned */}
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all">
                    Tous ({filteredDocuments.length})
                  </TabsTrigger>
                  <TabsTrigger value="unsigned">
                    À signer ({unsignedDocuments.length})
                  </TabsTrigger>
                  <TabsTrigger value="signed">
                    Signés ({signedDocuments.length})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="all" className="mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDocuments.map(doc => <DocumentCard key={doc.id} doc={doc} />)}
                  </div>
                </TabsContent>
                
                <TabsContent value="unsigned" className="mt-6">
                  {unsignedDocuments.length === 0 ? (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
                        <p className="text-muted-foreground text-center">
                          Tous les documents sont signés !
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {unsignedDocuments.map(doc => <DocumentCard key={doc.id} doc={doc} />)}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="signed" className="mt-6">
                  {signedDocuments.length === 0 ? (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground text-center">
                          Aucun document signé
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {signedDocuments.map(doc => <DocumentCard key={doc.id} doc={doc} />)}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Sélectionnez un bail pour voir ses documents
              </p>
            </CardContent>
          </Card>
        )}

        {/* Dialogs */}
        {viewingHistory && (
          <Dialog open={!!viewingHistory} onOpenChange={() => setViewingHistory(null)}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DocumentVersionHistory documentId={viewingHistory} />
            </DialogContent>
          </Dialog>
        )}

        {generatingContract && selectedLeaseId && (
          <GenerateContractDialog
            open={generatingContract}
            onOpenChange={setGeneratingContract}
            leaseId={selectedLeaseId}
            spaceId={userLeases.find(l => l.id === selectedLeaseId)?.space_id || ''}
            onSuccess={() => {
              refetch();
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Documents;
