// @ts-nocheck
import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { UserPlus, Mail, Shield, Trash2, Edit, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTenantContext } from '@/contexts/TenantContext';

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  tenant_id: string;
  created_at: string;
  email?: string;
  is_owner?: boolean;
}

interface NewUserForm {
  email: string;
  role: string;
}

const DashboardUsuarios = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  // Guard against missing TenantProvider
  let ctx: ReturnType<typeof useTenantContext> | null = null;
  try {
    ctx = useTenantContext();
  } catch (e) {
    ctx = null;
  }
  const currentTenantId = ctx?.currentTenantId ?? null;
  const isSuperAdmin = ctx?.isSuperAdmin ?? false;
  const tenantLoading = ctx?.isLoading ?? false;
  const [users, setUsers] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState<NewUserForm>({
    email: "",
    role: "tenant_staff",
  });
  const [userTenantId, setUserTenantId] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      if (!user || !currentTenantId) return;

      setUserTenantId(currentTenantId);

      // Skip role check for superadmins
      if (!isSuperAdmin) {
        // Get current user's role for this specific tenant
        const { data: currentUserRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('tenant_id', currentTenantId)
          .maybeSingle();

        if (!currentUserRole) {
          toast({
            title: "Error",
            description: "No se encontró tu rol en esta tienda",
            variant: "destructive",
          });
          return;
        }

        // Check if user is tenant admin
        if (currentUserRole.role !== 'tenant_admin') {
          toast({
            title: "Acceso Denegado",
            description: "No tienes permisos para gestionar usuarios",
            variant: "destructive",
          });
          return;
        }
      }

      // Fetch all users for this tenant
      const { data: tenantUsers, error } = await supabase
        .from('user_roles')
        .select(`
          id,
          user_id,
          role,
          tenant_id,
          created_at
        `)
        .eq('tenant_id', currentTenantId);

      if (error) throw error;

      // For demo purposes, we'll add mock email data since we can't access auth.users directly
      const usersWithEmails = tenantUsers?.map((userRole, index) => ({
        ...userRole,
        email: userRole.user_id === user.id ? user.email : `usuario${index + 1}@ejemplo.com`,
        is_owner: userRole.user_id === user.id,
      })) || [];

      setUsers(usersWithEmails);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async () => {
    try {
      if (!userTenantId) return;

      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newUserForm.email)) {
        toast({
          title: "Error",
          description: "Por favor ingresa un email válido",
          variant: "destructive",
        });
        return;
      }

      // Check if user already exists (simplified check)
      const existingUser = users.find(u => u.email === newUserForm.email);
      if (existingUser) {
        toast({
          title: "Error",
          description: "Este usuario ya tiene acceso a la tienda",
          variant: "destructive",
        });
        return;
      }

      // For demo purposes, we'll create a mock user invitation
      // In a real implementation, this would involve:
      // 1. Creating an invitation record
      // 2. Sending an email invitation
      // 3. Allowing the user to accept and create their account

      const mockUserId = `mock-user-${Date.now()}`;
      const newUser: UserRole = {
        id: `mock-role-${Date.now()}`,
        user_id: mockUserId,
        role: newUserForm.role,
        tenant_id: userTenantId,
        created_at: new Date().toISOString(),
        email: newUserForm.email,
        is_owner: false,
      };

      setUsers(prev => [...prev, newUser]);

      toast({
        title: "Invitación Enviada",
        description: `Se ha enviado una invitación a ${newUserForm.email}`,
      });

      setIsDialogOpen(false);
      setNewUserForm({ email: "", role: "tenant_staff" });

    } catch (error) {
      console.error('Error inviting user:', error);
      toast({
        title: "Error",
        description: "No se pudo enviar la invitación",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      // Remove user from state (in real implementation, this would delete from database)
      setUsers(prev => prev.filter(u => u.user_id !== userId));

      toast({
        title: "Usuario Eliminado",
        description: "El usuario ha sido removido de la tienda",
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el usuario",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (user && currentTenantId && !tenantLoading) {
      fetchUsers();
    }
  }, [user, currentTenantId, tenantLoading]);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'tenant_admin':
        return <Badge variant="default">Administrador</Badge>;
      case 'tenant_staff':
        return <Badge variant="secondary">Staff</Badge>;
      case 'superadmin':
        return <Badge variant="destructive">Super Admin</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'tenant_admin':
        return 'Acceso completo al dashboard y configuración';
      case 'tenant_staff':
        return 'Acceso a productos, órdenes y categorías';
      default:
        return 'Rol personalizado';
    }
  };

  if (!ctx) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">
            Administra quién puede acceder y gestionar tu tienda
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Invitar Usuario
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invitar Nuevo Usuario</DialogTitle>
              <DialogDescription>
                Envía una invitación para que alguien pueda ayudarte a gestionar tu tienda.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@ejemplo.com"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="role">Rol</Label>
                <Select value={newUserForm.role} onValueChange={(value) => setNewUserForm(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tenant_admin">Administrador - Acceso completo</SelectItem>
                    <SelectItem value="tenant_staff">Staff - Acceso limitado</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {getRoleDescription(newUserForm.role)}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleInviteUser}>
                <Mail className="w-4 h-4 mr-2" />
                Enviar Invitación
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Users Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">Usuarios activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administradores</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.role === 'tenant_admin').length}
            </div>
            <p className="text-xs text-muted-foreground">Con acceso completo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.role === 'tenant_staff').length}
            </div>
            <p className="text-xs text-muted-foreground">Con acceso limitado</p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuarios</CardTitle>
          <CardDescription>
            Todos los usuarios que tienen acceso a tu tienda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Fecha de Invitación</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((userRole) => (
                <TableRow key={userRole.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium">
                          {userRole.email?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{userRole.email}</p>
                        {userRole.is_owner && (
                          <p className="text-xs text-muted-foreground">Propietario</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getRoleBadge(userRole.role)}</TableCell>
                  <TableCell>
                    {new Date(userRole.created_at).toLocaleDateString('es-ES')}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-green-600">
                      Activo
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      {!userRole.is_owner && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar Usuario?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. El usuario perderá acceso a la tienda inmediatamente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteUser(userRole.user_id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardUsuarios;