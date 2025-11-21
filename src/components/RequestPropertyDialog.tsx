import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useRentalRequests } from '@/hooks/useRentalRequests';

interface RequestPropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  propertyTitle: string;
  managerId: string;
  spaceId: string;
  onSuccess?: () => void;
}

export const RequestPropertyDialog = ({
  open,
  onOpenChange,
  propertyId,
  propertyTitle,
  managerId,
  spaceId,
  onSuccess
}: RequestPropertyDialogProps) => {
  const { createRequest } = useRentalRequests();
  const [message, setMessage] = useState('');
  const [proposedStartDate, setProposedStartDate] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await createRequest({
      property_id: propertyId,
      manager_id: managerId,
      space_id: spaceId,
      message: message || undefined,
      proposed_start_date: proposedStartDate || undefined
    });

    setLoading(false);

    if (!result.error) {
      setMessage('');
      setProposedStartDate('');
      onOpenChange(false);
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Demander cette propriété</DialogTitle>
            <DialogDescription>
              Envoyez une demande de location pour "{propertyTitle}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="proposedDate">Date de début souhaitée</Label>
              <Input
                id="proposedDate"
                type="date"
                value={proposedStartDate}
                onChange={(e) => setProposedStartDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message au gestionnaire (optionnel)</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Présentez-vous et expliquez pourquoi vous souhaitez louer cette propriété..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Envoi...' : 'Envoyer la demande'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
