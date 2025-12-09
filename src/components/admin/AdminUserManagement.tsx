// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, MessageCircle, Mail, Crown, Ban, Trash2, RefreshCw, Download, ExternalLink } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface UserData {
  user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  whatsapp?: string;
  registered_at: string;
  last_sign_in_at?: string;
  tenant_id?: string;
  tenant_name?: string;
  plan?: string;
  tenant_status?: string;
  role?: string;
  total_products: number;
  total_orders: number;
  total_revenue_usd: number;
}

export const AdminUserManagement = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState('');
  const [filterPlan, setFilterPlan] = useState<'free' | 'basic' | 'premium' | 'all'>('all');
  const [filterRole, setFilterRole] = useState<'superadmin' | 'tenant_admin' | 'tenant_staff' | 'all'>('all');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [actionDialog, setActionDialog] = useState<'suspend' | 'delete' | 'promote' | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [newRole, setNewRole] = useState<'superadmin' | 'tenant_admin' | 'tenant_staff'>('tenant_admin');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const { toast } = useToast();

  const pageSize = 20;

  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchEmail, filterPlan, filterRole]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_user_analytics', {
        limit_count: pageSize,
        offset_count: currentPage * pageSize,
        search_email: searchEmail,
        filter_plan: filterPlan === 'all' ? null : filterPlan as 'free' | 'basic' | 'premium',
        filter_role: filterRole === 'all' ? null : filterRole as 'superadmin' | 'tenant_admin' | 'tenant_staff'
      });

      if (error) throw error;
      
      setUsers((data as any) || []);
      // Estimate total pages (this could be improved with a count function)
      setTotalPages(Math.ceil(((data as any)?.length || 0) === pageSize ? (currentPage + 2) : (currentPage + 1)));
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const logActivity = async (action: string, targetUserId?: string, targetTenantId?: string, description?: string) => {
    try {
      await supabase.rpc('log_admin_activity', {
        p_action_type: action,
        p_target_user_id: targetUserId || null,
        p_target_tenant_id: targetTenantId || null,
        p_description: description || '',
        p_metadata: {}
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  const handleSendWhatsApp = (user: UserData) => {
    if (!user.whatsapp) {
      toast({
        title: "Sin WhatsApp",
        description: "Este usuario no tiene número de WhatsApp registrado",
        variant: "destructive"
      });
      return;
    }

    const message = `Hola ${user.first_name || user.username || 'Usuario'}, te contactamos desde el equipo de administración.`;
    const whatsappUrl = `https://wa.me/${user.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    
    logActivity('whatsapp_contact', user.user_id, user.tenant_id, `Contacto WhatsApp a ${user.email}`);
  };

  const handleSendEmail = (user: UserData) => {
    const subject = 'Contacto desde Administración';
    const mailtoUrl = `mailto:${user.email}?subject=${encodeURIComponent(subject)}`;
    window.open(mailtoUrl, '_blank');
    
    logActivity('email_contact', user.user_id, user.tenant_id, `Contacto email a ${user.email}`);
  };

  const exportUsers = () => {
    const csvContent = [
      'Email,Nombre,Username,WhatsApp,Plan,Tenant,Productos,Órdenes,Revenue,Registro',
      ...users.map(user => [
        user.email,
        `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        user.username || '',
        user.whatsapp || '',
        user.plan || '',
        user.tenant_name || '',
        user.total_products,
        user.total_orders,
        user.total_revenue_usd,
        format(new Date(user.registered_at), 'dd/MM/yyyy', { locale: es })
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `usuarios_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();

    logActivity('export_users', undefined, undefined, `Exportación de ${users.length} usuarios`);
    
    toast({
      title: "Exportación completada",
      description: `Se exportaron ${users.length} usuarios a CSV`
    });
  };

  const getPlanBadgeColor = (plan?: string) => {
    switch (plan) {
      case 'free': return 'bg-gray-100 text-gray-800';
      case 'basic': return 'bg-blue-100 text-blue-800';
      case 'premium': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'superadmin': return 'bg-red-100 text-red-800';
      case 'tenant_admin': return 'bg-green-100 text-green-800';
      case 'tenant_staff': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleUserAction = async (action: 'change_role' | 'suspend_user' | 'reactivate_user' | 'delete_user') => {
    if (!selectedUser) return;

    setActionLoading(true);
    try {
      console.log(`Performing action: ${action} on user:`, selectedUser);
      
      const { data, error } = await supabase.functions.invoke('manage-user-roles', {
        body: {
          action,
          targetUserId: selectedUser.user_id,
          targetTenantId: selectedUser.tenant_id === 'null' || selectedUser.tenant_id === null ? null : selectedUser.tenant_id,
          newRole: action === 'change_role' ? newRole : undefined,
          reason: action === 'suspend_user' ? suspendReason : action === 'delete_user' ? `Confirmed deletion: ${deleteConfirmText}` : undefined
        }
      });

      if (error) throw error;

      console.log('User action completed successfully:', data);

      toast({
        title: "Acción completada",
        description: getSuccessMessage(action),
      });

      // Reset states
      setActionDialog(null);
      setSelectedUser(null);
      setDeleteConfirmText('');
      setSuspendReason('');
      setNewRole('tenant_admin');

      // Force immediate refresh for deletion
      if (action === 'delete_user') {
        console.log('Forcing immediate refresh after user deletion');
        // Wait a moment for the deletion to propagate
        setTimeout(() => {
          fetchUsers();
        }, 1000);
      } else {
        // Refresh users list for other actions
        fetchUsers();
      }

    } catch (error: any) {
      console.error('Error performing user action:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo completar la acción",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getSuccessMessage = (action: string) => {
    switch (action) {
      case 'change_role': return `Rol cambiado a ${newRole}`;
      case 'suspend_user': return 'Usuario suspendido correctamente';
      case 'reactivate_user': return 'Usuario reactivado correctamente';
      case 'delete_user': return 'Usuario eliminado correctamente';
      default: return 'Acción completada';
    }
  };

  const isUserSuspended = (user: UserData) => user.tenant_status === 'suspended';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Gestión de Usuarios</span>
            <div className="flex gap-2">
              <Button onClick={exportUsers} variant="outline" size="sm" className="rounded-[30px]">
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
              <Button onClick={fetchUsers} variant="outline" size="sm" className="rounded-[30px]">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Administra todos los usuarios registrados en la plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar por email..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="pl-10 rounded-[30px]"
                />
              </div>
            </div>
            <Select value={filterPlan} onValueChange={(value) => setFilterPlan(value as 'free' | 'basic' | 'premium' | 'all')}>
              <SelectTrigger className="w-[150px] rounded-[30px]">
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los planes</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterRole} onValueChange={(value) => setFilterRole(value as 'superadmin' | 'tenant_admin' | 'tenant_staff' | 'all')}>
              <SelectTrigger className="w-[150px] rounded-[30px]">
                <SelectValue placeholder="Rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                <SelectItem value="superadmin">Superadmin</SelectItem>
                <SelectItem value="tenant_admin">Admin</SelectItem>
                <SelectItem value="tenant_staff">Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Plan/Rol</TableHead>
                  <TableHead>Actividad</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}>
                        <div className="h-16 bg-muted animate-pulse rounded"></div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No se encontraron usuarios
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user, index) => (
                    <TableRow key={`${user.user_id}-${index}`}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.email}</div>
                          <div className="text-sm text-muted-foreground">
                            {user.first_name && user.last_name 
                              ? `${user.first_name} ${user.last_name}`
                              : user.username || 'Sin nombre'
                            }
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(user.registered_at), 'dd/MM/yyyy', { locale: es })}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {user.whatsapp && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSendWhatsApp(user)}
                              className="h-8 px-2 justify-start"
                            >
                              <MessageCircle className="w-3 h-3 mr-1" />
                              {user.whatsapp}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSendEmail(user)}
                            className="h-8 px-2 justify-start"
                          >
                            <Mail className="w-3 h-3 mr-1" />
                            Email
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.tenant_name ? (
                          <div>
                            <div className="font-medium">{user.tenant_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {user.total_products} productos
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Sin tenant</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {user.plan && (
                            <Badge className={`text-xs ${getPlanBadgeColor(user.plan)}`}>
                              {user.plan.toUpperCase()}
                            </Badge>
                          )}
                          {user.role && (
                            <Badge className={`text-xs ${getRoleBadgeColor(user.role)}`}>
                              {user.role === 'superadmin' ? 'SUPER' : 
                               user.role === 'tenant_admin' ? 'ADMIN' : 'STAFF'}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{user.total_orders} órdenes</div>
                          <div className="text-xs text-muted-foreground">
                            {user.last_sign_in_at 
                              ? `Último: ${format(new Date(user.last_sign_in_at), 'dd/MM', { locale: es })}`
                              : 'Nunca'
                            }
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          ${user.total_revenue_usd.toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {user.tenant_id && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={() => window.open(`/tienda?preview=${user.tenant_id}`, '_blank')}
                            >
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              setSelectedUser(user);
                              setActionDialog('promote');
                            }}
                          >
                            <Crown className="w-3 h-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              setSelectedUser(user);
                              setActionDialog('suspend');
                            }}
                          >
                            <Ban className="w-3 h-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-destructive"
                            onClick={() => {
                              setSelectedUser(user);
                              setActionDialog('delete');
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-muted-foreground">
              Página {currentPage + 1} de {totalPages || 1}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                className="rounded-[30px]"
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage >= totalPages - 1}
                className="rounded-[30px]"
              >
                Siguiente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Dialogs */}
      <Dialog open={!!actionDialog} onOpenChange={() => {
        setActionDialog(null);
        setDeleteConfirmText('');
        setSuspendReason('');
        setNewRole('tenant_admin');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog === 'suspend' && (selectedUser && isUserSuspended(selectedUser) ? 'Reactivar Usuario' : 'Suspender Usuario')}
              {actionDialog === 'delete' && 'Eliminar Usuario'}
              {actionDialog === 'promote' && 'Cambiar Rol'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog === 'suspend' && (selectedUser && isUserSuspended(selectedUser)
                ? 'El usuario será reactivado y podrá acceder nuevamente'
                : 'El usuario será suspendido temporalmente')}
              {actionDialog === 'delete' && 'Esta acción marcará el usuario como eliminado. No se puede deshacer.'}
              {actionDialog === 'promote' && 'Cambiar el rol del usuario en el sistema'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {selectedUser && (
              <div className="bg-muted p-4 rounded-lg">
                <p><strong>Usuario:</strong> {selectedUser.email}</p>
                <p><strong>Nombre:</strong> {selectedUser.first_name} {selectedUser.last_name}</p>
                <p><strong>Tenant:</strong> {selectedUser.tenant_name || 'Sin tenant'}</p>
                <p><strong>Plan:</strong> {selectedUser.plan || 'Sin plan'}</p>
                <p><strong>Rol actual:</strong> {selectedUser.role || 'Sin rol'}</p>
                {selectedUser.tenant_status && (
                  <p><strong>Estado:</strong> 
                    <Badge className={`ml-2 ${selectedUser.tenant_status === 'suspended' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                      {selectedUser.tenant_status === 'suspended' ? 'SUSPENDIDO' : selectedUser.tenant_status.toUpperCase()}
                    </Badge>
                  </p>
                )}
              </div>
            )}

            {/* Role Selection */}
            {actionDialog === 'promote' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Nuevo rol:</label>
                <Select value={newRole} onValueChange={(value) => setNewRole(value as 'superadmin' | 'tenant_admin' | 'tenant_staff')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="superadmin">Superadmin</SelectItem>
                    <SelectItem value="tenant_admin">Tenant Admin</SelectItem>
                    <SelectItem value="tenant_staff">Tenant Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Suspend Reason */}
            {actionDialog === 'suspend' && selectedUser && !isUserSuspended(selectedUser) && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Razón de suspensión (opcional):</label>
                <Input
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="Motivo de la suspensión..."
                />
              </div>
            )}

            {/* Delete Confirmation */}
            {actionDialog === 'delete' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Para confirmar, escribe "ELIMINAR":</label>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="ELIMINAR"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)} disabled={actionLoading} className="rounded-[30px]">
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (actionDialog === 'suspend') {
                  handleUserAction(selectedUser && isUserSuspended(selectedUser) ? 'reactivate_user' : 'suspend_user');
                } else if (actionDialog === 'delete') {
                  if (deleteConfirmText !== 'ELIMINAR') {
                    toast({
                      title: "Confirmación requerida",
                      description: "Debes escribir 'ELIMINAR' para confirmar",
                      variant: "destructive"
                    });
                    return;
                  }
                  handleUserAction('delete_user');
                } else if (actionDialog === 'promote') {
                  handleUserAction('change_role');
                }
              }}
              disabled={actionLoading || (actionDialog === 'delete' && deleteConfirmText !== 'ELIMINAR')}
              variant={actionDialog === 'delete' ? 'destructive' : 'default'}
              className="rounded-[30px]"
            >
              {actionLoading ? 'Procesando...' : 
               actionDialog === 'suspend' ? (selectedUser && isUserSuspended(selectedUser) ? 'Reactivar' : 'Suspender') :
               actionDialog === 'delete' ? 'Eliminar' : 'Cambiar Rol'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};