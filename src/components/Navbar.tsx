import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building2, LogOut, User, Home, Settings, DollarSign } from 'lucide-react';
import { NotificationDropdown } from '@/components/NotificationDropdown';
import { SpaceSelector } from '@/components/SpaceSelector';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const Navbar = () => {
  const { user, signOut } = useAuth();
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
        <Link to="/" className="flex items-center space-x-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-primary">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            LoyerFacile
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <div className="hidden md:block w-64">
                <SpaceSelector />
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
