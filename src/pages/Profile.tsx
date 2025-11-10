import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const profileSchema = z.object({
  fullName: z.string().trim().min(2, { message: "Le nom doit contenir au moins 2 caractères" }).max(100),
  phone: z.string().trim().min(8, { message: "Numéro de téléphone invalide" }).max(20)
});

const Profile = () => {
  const navigate = useNavigate();
  const { user, userRole, signOut, updateProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    fullName: '',
    phone: '',
    avatarUrl: ''
  });
  const [errors, setErrors] = useState<any>({});

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, phone, avatar_url')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setProfileData({
          fullName: data.full_name || '',
          phone: data.phone || '',
          avatarUrl: data.avatar_url || ''
        });
      }
    };

    fetchProfile();
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = profileSchema.safeParse({
      fullName: profileData.fullName,
      phone: profileData.phone
    });

    if (!result.success) {
      const newErrors: any = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) newErrors[err.path[0]] = err.message;
      });
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    await updateProfile(profileData.fullName, profileData.phone, profileData.avatarUrl);
    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const getRoleBadgeVariant = (role: string | null) => {
    switch (role) {
      case 'gestionnaire':
        return 'default';
      case 'proprietaire':
        return 'secondary';
      case 'locataire':
      default:
        return 'outline';
    }
  };

  const getRoleLabel = (role: string | null) => {
    switch (role) {
      case 'gestionnaire':
        return 'Gestionnaire';
      case 'proprietaire':
        return 'Propriétaire';
      case 'locataire':
      default:
        return 'Locataire';
    }
  };

  if (!user) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">Mon Profil</CardTitle>
            <Badge variant={getRoleBadgeVariant(userRole)}>
              {getRoleLabel(userRole)}
            </Badge>
          </div>
          <CardDescription>
            Gérez vos informations personnelles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                L'email ne peut pas être modifié
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Nom complet</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Jean Dupont"
                value={profileData.fullName}
                onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                required
              />
              {errors.fullName && (
                <p className="text-sm text-destructive">{errors.fullName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+225 0102030405"
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                required
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone}</p>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? 'Mise à jour...' : 'Mettre à jour'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/')}>
                Retour
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t">
            <Button variant="destructive" className="w-full" onClick={handleSignOut}>
              Se déconnecter
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
