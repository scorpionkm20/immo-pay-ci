import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, UserCog, Search, History, Filter, Activity, AlertCircle } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuditLogs, useAuditStats } from '@/hooks/useAuditLogs';
import { Badge } from '@/components/ui/badge';

interface UserWithRole {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'gestionnaire' | 'proprietaire' | 'locataire';
  created_at: string;
}

interface RoleHistory {
  id: string;
  user_id: string;
  old_role: string | null;
  new_role: string;
  changed_by: string;
  changed_at: string;
  user_name?: string;
  changed_by_name?: string;
}

const AdminPanel = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [history, setHistory] = useState<RoleHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  const checkAdminAccess = async () => {
    if (!user) {
      navigate('/auth?redirect=/admin');
      return;
    }

    // Check if user is admin
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin' as any)
      .single();

    if (error || !data) {
      toast({
        variant: 'destructive',
        title: 'Accès refusé',
        description: 'Vous n\'avez pas les droits d\'administrateur'
      });
      navigate('/');
      return;
    }

    setIsAdmin(true);
    fetchUsers();
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const usersData = profiles.map(profile => {
        const userRole = roles.find(r => r.user_id === profile.user_id);
        return {
          id: profile.user_id,
          email: '',
          full_name: profile.full_name || 'Utilisateur sans nom',
          role: userRole?.role || 'locataire',
          created_at: new Date().toISOString()
        } as UserWithRole;
      });

      setUsers(usersData);
      setFilteredUsers(usersData);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de charger les utilisateurs'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRoleHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data: historyData, error } = await supabase
        .from('user_role_history')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Fetch user names
      const userIds = new Set([
        ...historyData.map(h => h.user_id),
        ...historyData.map(h => h.changed_by)
      ]);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', Array.from(userIds));

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      const enrichedHistory = historyData.map(h => ({
        ...h,
        user_name: profileMap.get(h.user_id) || 'Utilisateur inconnu',
        changed_by_name: profileMap.get(h.changed_by) || 'Système'
      }));

      setHistory(enrichedHistory);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de charger l\'historique'
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.full_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    setFilteredUsers(filtered);
  }, [searchTerm, roleFilter, users]);

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase
        .from('user_roles')
        .insert([{ user_id: userId, role: newRole as any }]);

      if (insertError) throw insertError;

      toast({
        title: 'Rôle mis à jour',
        description: 'Le rôle de l\'utilisateur a été modifié avec succès'
      });

      fetchUsers();
      fetchRoleHistory();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.message || 'Impossible de mettre à jour le rôle'
      });
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Panneau d'administration</CardTitle>
                <CardDescription>Gérer les rôles et voir l'historique</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="users" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="users">
                  <UserCog className="h-4 w-4 mr-2" />
                  Utilisateurs
                </TabsTrigger>
                <TabsTrigger value="history" onClick={() => !history.length && fetchRoleHistory()}>
                  <History className="h-4 w-4 mr-2" />
                  Historique
                </TabsTrigger>
                <TabsTrigger value="audit">
                  <Activity className="h-4 w-4 mr-2" />
                  Audit
                </TabsTrigger>
              </TabsList>

              <TabsContent value="users" className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher un utilisateur..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-full md:w-[200px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filtrer par rôle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les rôles</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="gestionnaire">Gestionnaire</SelectItem>
                      <SelectItem value="proprietaire">Propriétaire</SelectItem>
                      <SelectItem value="locataire">Locataire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucun utilisateur trouvé
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nom</TableHead>
                          <TableHead>Rôle actuel</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <UserCog className="h-4 w-4 text-muted-foreground" />
                                {user.full_name}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-primary/10 text-primary">
                                {user.role}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={user.role}
                                onValueChange={(value) => updateUserRole(user.id, value)}
                              >
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="gestionnaire">Gestionnaire</SelectItem>
                                  <SelectItem value="proprietaire">Propriétaire</SelectItem>
                                  <SelectItem value="locataire">Locataire</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history">
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucun historique disponible
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Utilisateur</TableHead>
                          <TableHead>Ancien rôle</TableHead>
                          <TableHead>Nouveau rôle</TableHead>
                          <TableHead>Modifié par</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {history.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="text-sm">
                              {format(new Date(entry.changed_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                            </TableCell>
                            <TableCell className="font-medium">{entry.user_name}</TableCell>
                            <TableCell>
                              {entry.old_role ? (
                                <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-muted text-muted-foreground">
                                  {entry.old_role}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs">Aucun</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-primary/10 text-primary">
                                {entry.new_role}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm">{entry.changed_by_name}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="audit">
                <AuditLogsTab />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// New component for Audit Logs tab
const AuditLogsTab = () => {
  const { data: logs, isLoading } = useAuditLogs(100);
  const { data: stats } = useAuditStats();

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('approved') || action.includes('created')) return 'default';
    if (action.includes('rejected') || action.includes('removed')) return 'destructive';
    if (action.includes('updated') || action.includes('changed')) return 'secondary';
    return 'outline';
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {stats && stats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.slice(0, 6).map((stat) => (
            <Card key={`${stat.action}-${stat.resource_type}`}>
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  {stat.resource_type}
                </CardDescription>
                <CardTitle className="text-2xl">{stat.count}</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant={getActionBadgeVariant(stat.action)}>
                  {stat.action}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Journal d'audit
          </CardTitle>
          <CardDescription>
            Les 100 dernières actions critiques effectuées sur la plateforme
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : !logs || logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun log d'audit disponible
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Ressource</TableHead>
                    <TableHead>Détails</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: fr })}
                      </TableCell>
                      <TableCell className="font-medium">{log.user_name}</TableCell>
                      <TableCell>
                        <Badge variant={getActionBadgeVariant(log.action)}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {log.resource_type}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {log.details && (
                          <span className="text-xs font-mono">
                            {JSON.stringify(log.details).substring(0, 50)}...
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPanel;
