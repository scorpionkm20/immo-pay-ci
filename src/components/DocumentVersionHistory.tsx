import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Clock } from 'lucide-react';
import { useDocumentVersions } from '@/hooks/useDocumentVersions';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DocumentVersionHistoryProps {
  documentId: string;
}

export const DocumentVersionHistory = ({ documentId }: DocumentVersionHistoryProps) => {
  const { versions, loading, getVersionIcon, getVersionLabel } = useDocumentVersions(documentId);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Historique des versions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Historique des versions
        </CardTitle>
        <CardDescription>
          Traçabilité complète des modifications avec horodatage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {versions.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aucun historique disponible</p>
        ) : (
          <div className="space-y-3">
            {versions.map((version) => (
              <div
                key={version.id}
                className="flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getVersionIcon(version.modification_type)}</span>
                    <Badge variant="outline">
                      Version {version.version_number}
                    </Badge>
                    <Badge variant="secondary">
                      {getVersionLabel(version.modification_type)}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium">{version.changes_description}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(version.created_at), {
                      addSuffix: true,
                      locale: fr,
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {version.file_name} ({(version.file_size / 1024).toFixed(2)} Ko)
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(version.file_url, '_blank')}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
