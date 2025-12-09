// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, RefreshCw, Shield, User, Building, Mail, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ActivityLog {
  id: string;
  admin_user_id: string;
  action_type: string;
  target_user_id?: string;
  target_tenant_id?: string;
  description: string;
  metadata: any;
  created_at: string;
  admin_email?: string;
  target_email?: string;
  tenant_name?: string;
}

export const AdminActivityLogs = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(0);
  const { toast } = useToast();

  const pageSize = 50;

  useEffect(() => {
    fetchLogs();
  }, [currentPage]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_activity_logs')
        .select(`
          id,
          admin_user_id,
          action_type,
          target_user_id,
          target_tenant_id,
          description,
          metadata,
          created_at
        `)
        .order('created_at', { ascending: false })
        .range(currentPage * pageSize, (currentPage + 1) * pageSize - 1);

      if (error) throw error;

      // Enhance logs with user and tenant information
      const enhancedLogs = await Promise.all(
        (data || []).map(async (log) => {
          const enhancedLog: ActivityLog = { ...(log as any) };

          // Get admin email
          if ('admin_user_id' in log && log.admin_user_id) {
            const { data: adminData } = await supabase
              .from('user_roles')
              .select('user_id')
              .eq('user_id', log.admin_user_id)
              .maybeSingle();
            
            if (adminData && 'user_id' in adminData) {
              // Note: In a real implementation, you'd get the email from a secure endpoint
              enhancedLog.admin_email = 'admin@system.com'; // Placeholder
            }
          }

          // Get target user email
          if ('target_user_id' in log && log.target_user_id) {
            // Note: In a real implementation, you'd get the email from a secure endpoint
            enhancedLog.target_email = 'user@example.com'; // Placeholder
          }

          // Get tenant name
          if ('target_tenant_id' in log && log.target_tenant_id) {
            const { data: tenantData } = await supabase
              .from('tenants')
              .select('name')
              .eq('id', log.target_tenant_id)
              .maybeSingle();
            
            if (tenantData && 'name' in tenantData) {
              enhancedLog.tenant_name = tenantData.name;
            }
          }

          return enhancedLog;
        })
      );

      setLogs(enhancedLogs);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los logs de actividad",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.action_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (log.target_email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (log.tenant_name?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesAction = filterAction === 'all' || log.action_type === filterAction;
    
    return matchesSearch && matchesAction;
  });

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'user_suspend':
      case 'user_delete':
      case 'tenant_suspend':
        return <Shield className="w-4 h-4 text-red-500" />;
      case 'user_promote':
      case 'plan_change':
        return <User className="w-4 h-4 text-blue-500" />;
      case 'whatsapp_contact':
        return <MessageCircle className="w-4 h-4 text-green-500" />;
      case 'email_contact':
        return <Mail className="w-4 h-4 text-blue-500" />;
      case 'export_users':
        return <Building className="w-4 h-4 text-purple-500" />;
      default:
        return <Shield className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActionBadgeColor = (actionType: string) => {
    if (actionType.includes('delete') || actionType.includes('suspend')) {
      return 'bg-red-100 text-red-800';
    }
    if (actionType.includes('contact') || actionType.includes('export')) {
      return 'bg-blue-100 text-blue-800';
    }
    if (actionType.includes('promote') || actionType.includes('change')) {
      return 'bg-green-100 text-green-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  const actionTypes = [...new Set(logs.map(log => log.action_type))];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Logs de Actividad Administrativa</span>
            <Button onClick={fetchLogs} variant="outline" size="sm" className="rounded-[30px]">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </CardTitle>
          <CardDescription>
            Registro de todas las acciones realizadas por los administradores
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar en logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 rounded-[30px]"
                />
              </div>
            </div>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-[200px] rounded-[30px]">
                <SelectValue placeholder="Tipo de acción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las acciones</SelectItem>
                {actionTypes.map(actionType => (
                  <SelectItem key={actionType} value={actionType}>
                    {actionType.replace('_', ' ').toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Activity Summary */}
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Acciones</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{logs.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Acciones Críticas</CardTitle>
                <Shield className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {logs.filter(log => log.action_type.includes('delete') || log.action_type.includes('suspend')).length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Contactos</CardTitle>
                <MessageCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {logs.filter(log => log.action_type.includes('contact')).length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Hoy</CardTitle>
                <Shield className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {logs.filter(log => {
                    const logDate = new Date(log.created_at);
                    const today = new Date();
                    return logDate.toDateString() === today.toDateString();
                  }).length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Logs Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Acción</TableHead>
                  <TableHead>Administrador</TableHead>
                  <TableHead>Objetivo</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(10)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5}>
                        <div className="h-12 bg-muted animate-pulse rounded"></div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No se encontraron logs de actividad
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getActionIcon(log.action_type)}
                          <Badge className={`text-xs ${getActionBadgeColor(log.action_type)}`}>
                            {log.action_type.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {log.admin_email || (log.admin_user_id ? log.admin_user_id.substring(0, 8) + '...' : 'Sistema')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {log.target_email && (
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {log.target_email}
                            </div>
                          )}
                          {log.tenant_name && (
                            <div className="flex items-center gap-1">
                              <Building className="w-3 h-3" />
                              {log.tenant_name}
                            </div>
                          )}
                          {!log.target_email && !log.tenant_name && (
                            <span className="text-muted-foreground">Sistema</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm max-w-md">
                          {log.description}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{format(new Date(log.created_at), 'dd/MM/yyyy', { locale: es })}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(log.created_at), 'HH:mm:ss', { locale: es })}
                          </div>
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
              Mostrando {Math.min(filteredLogs.length, pageSize)} de {filteredLogs.length} logs
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
                disabled={logs.length < pageSize}
                className="rounded-[30px]"
              >
                Siguiente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};