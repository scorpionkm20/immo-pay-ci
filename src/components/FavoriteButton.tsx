import { useState } from 'react';
import { usePropertyFavorites } from '@/hooks/usePropertyFavorites';
import { Property } from '@/hooks/useProperties';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  property: Property;
  className?: string;
  iconClassName?: string;
}

export const FavoriteButton = ({ property, className, iconClassName }: FavoriteButtonProps) => {
  const { isFavorite, toggleFavorite } = usePropertyFavorites();
  const [isAnimating, setIsAnimating] = useState(false);
  const favorite = isFavorite(property.id);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsAnimating(true);
    await toggleFavorite(property);
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      className={cn(
        "relative hover:bg-background/80 transition-all duration-200",
        isAnimating && "scale-125",
        className
      )}
    >
      <Heart
        className={cn(
          "transition-all duration-300",
          favorite ? "fill-red-500 text-red-500" : "text-muted-foreground",
          isAnimating && "animate-pulse",
          iconClassName
        )}
      />
    </Button>
  );
};
