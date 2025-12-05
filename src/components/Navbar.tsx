import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useManagementSpaces } from '@/hooks/useManagementSpaces';
import { Button } from '@/components/ui/button';
import loyerFacileLogo from '@/assets/loyerfacile-logo.png';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building2, LogOut, User, Home, Settings, DollarSign, FileCheck, FileText } from 'lucide-react';
import { NotificationDropdown } from '@/components/NotificationDropdown';
import { RentalRequestsBadge } from '@/components/RentalRequestsBadge';
import { SpaceSelector } from '@/components/SpaceSelector';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const Navbar = () => {
  const { user, signOut, userRole } = useAuth();
  const { currentSpace } = useManagementSpaces();
  const navigate = useNavigate();
  const [avatarUrl, setAvatarUrl] = useState<string>('');

  useEffect(() => {
    if (user) {
      fetchAvatar();
    }
  }, [user]);

  const fetchAvatar = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('user_id', user.id)
      .single();
    
    if (data?.avatar_url) {
      setAvatarUrl(data.avatar_url);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getUserInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center space-x-2 animate-[slide-in-top_0.6s_ease-out]">
          <img 
            src={loyerFacileLogo} 
            alt="LoyerFacile Logo" 
            className="h-10 w-auto"
          />
        </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <div className="hidden md:flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full border border-primary/20">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium text-primary">Espace actif</span>
                </div>
                <div className="w-56">
                  <SpaceSelector />
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="hidden md:flex"
              >
                <Home className="mr-2 h-4 w-4" />
                Tableau de bord
              </Button>
              
              <RentalRequestsBadge />
              
              <NotificationDropdown />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar>
                      <AvatarImage src={avatarUrl} alt="Photo de profil" />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getUserInitials(user.email || 'U')}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">Mon compte</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  
                  {/* Mobile Space Indicator */}
                  <div className="md:hidden px-2 py-2">
                    <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg border border-primary/20">
                      <Building2 className="h-4 w-4 text-primary shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] text-primary/70 uppercase tracking-wider">Espace actif</span>
                        <span className="text-sm font-medium text-primary truncate">
                          {currentSpace?.nom || 'Aucun espace'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                    <Home className="mr-2 h-4 w-4" />
                    <span>Tableau de bord</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profil</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/manage-space')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Gérer l'espace</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/documents')}>
                    <FileText className="mr-2 h-4 w-4" />
                    <span>Documents & Contrats</span>
                  </DropdownMenuItem>
                  {(userRole === 'gestionnaire' || userRole === 'admin') && (
                    <DropdownMenuItem onClick={() => navigate('/rental-requests')}>
                      <FileCheck className="mr-2 h-4 w-4" />
                      <span>Demandes de location</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => navigate('/finance')}>
                    <DollarSign className="mr-2 h-4 w-4" />
                    <span>Finances</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Se déconnecter</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => navigate('/properties')}
                className="hidden md:flex"
              >
                Annonces
              </Button>
              <Button variant="outline" onClick={() => navigate('/auth')}>
                Connexion
              </Button>
              <Button onClick={() => navigate('/auth')}>
                S'inscrire
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};
