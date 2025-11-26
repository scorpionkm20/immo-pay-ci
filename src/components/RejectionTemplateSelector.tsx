import { useState, useEffect } from 'react';
import { useRejectionTemplates } from '@/hooks/useRejectionTemplates';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RejectionTemplateSelectorProps {
  spaceId: string;
  value: string;
  onChange: (value: string) => void;
  showManageButton?: boolean;
}

export const RejectionTemplateSelector = ({ 
  spaceId, 
  value, 
  onChange,
  showManageButton = true 
}: RejectionTemplateSelectorProps) => {
  const { templates, loading, createDefaultTemplates } = useRejectionTemplates(spaceId);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && templates.length === 0) {
      createDefaultTemplates();
    }
  }, [loading, templates.length]);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    
    if (templateId === 'custom') {
      onChange('');
      return;
    }

    const template = templates.find(t => t.id === templateId);
    if (template) {
      onChange(template.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Modèle de réponse</Label>
          {showManageButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/manage-rejection-templates')}
              className="h-8 gap-2"
            >
              <Settings className="h-3 w-3" />
              Gérer les modèles
            </Button>
          )}
        </div>
        <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner un modèle ou personnaliser" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="custom">Message personnalisé</SelectItem>
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                {template.nom}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason">Raison du rejet</Label>
        <Textarea
          id="reason"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={selectedTemplateId === 'custom' ? "Expliquez la raison du rejet..." : ""}
          rows={4}
          disabled={selectedTemplateId !== 'custom' && selectedTemplateId !== ''}
        />
      </div>
    </div>
  );
};
