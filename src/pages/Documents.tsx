import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDocuments } from '@/hooks/useDocuments';
import { useLeases } from '@/hooks/useLeases';
import { useAuth } from '@/hooks/useAuth';
import { DocumentUpload } from '@/components/DocumentUpload';
import { SignatureCanvas } from '@/components/SignatureCanvas';
import { ArrowLeft, FileText, Download, Trash2, PenTool, CheckCircle } from 'lucide-react';
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
  
  const { user, userRole } = useAuth();
  const { leases, loading: leasesLoading } = useLeases();
  const { documents, loading, uploadDocument, signDocument, deleteDocument } = useDocuments(selectedLeaseId);

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
    const colors: Record<string, string> = {
      bail: 'bg-blue-500',
      quittance: 'bg-green-500',
      etat_lieux: 'bg-yellow-500',
      autre: 'bg-gray-500'
    };
    return colors[type] || 'bg-gray-500';
  };

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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold">Documents & Contrats</h1>
          </div>
          {userRole === 'gestionnaire' && selectedLeaseId && !showUpload && (
            <Button onClick={() => setShowUpload(true)}>
              <FileText className="h-4 w-4 mr-2" />
              Ajouter un document
            </Button>
          )}
        </div>

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
                    Bail - {lease.montant_mensuel.toLocaleString()} FCFA/mois
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {documents.map((doc) => (
                <Card key={doc.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{doc.titre}</CardTitle>
                        <Badge className={getDocumentTypeBadge(doc.type_document)}>
                          {getDocumentTypeLabel(doc.type_document)}
                        </Badge>
                      </div>
                      {doc.signe && (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      <p>{doc.file_name}</p>
                      <p>{(doc.file_size / 1024 / 1024).toFixed(2)} MB</p>
                      <p>Ajouté le {format(new Date(doc.created_at), 'PPp', { locale: fr })}</p>
                      {doc.signe && doc.date_signature && (
                        <p className="text-green-600">
                          Signé le {format(new Date(doc.date_signature), 'PPp', { locale: fr })}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
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
              ))}
            </div>
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
      </div>
    </div>
  );
};

export default Documents;
