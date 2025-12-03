import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  backTo?: string;
  showBackButton?: boolean;
  actions?: ReactNode;
  children?: ReactNode;
}

export const PageHeader = ({
  title,
  description,
  backTo = '/dashboard',
  showBackButton = true,
  actions,
  children,
}: PageHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="mb-6">
      {showBackButton && (
        <Button 
          variant="ghost" 
          onClick={() => backTo ? navigate(backTo) : navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
      )}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          {description && (
            <p className="text-muted-foreground mt-2">{description}</p>
          )}
          {children}
        </div>
        {actions && (
          <div className="flex gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};
