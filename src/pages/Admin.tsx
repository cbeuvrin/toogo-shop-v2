// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Building, DollarSign, TrendingUp, Shield, Settings, MessageSquare, Phone, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminMetrics } from '@/components/admin/AdminMetrics';
import { AdminUserManagement } from '@/components/admin/AdminUserManagement';
import { AdminTenantManagement } from '@/components/admin/AdminTenantManagement';
import { AdminActivityLogs } from '@/components/admin/AdminActivityLogs';
import { AdminSettings } from '@/components/admin/AdminSettings';
import AdminChatbotSettings from '@/components/admin/AdminChatbotSettings';
import { AdminDomainPurchases } from '@/components/admin/AdminDomainPurchases';
import { AdminBlogEditor } from '@/components/admin/AdminBlogEditor';
import { BlogContentFixer } from '@/components/admin/BlogContentFixer';
import { AdminWhatsAppSettings } from '@/components/admin/AdminWhatsAppSettings';

import { useToast } from '@/hooks/use-toast';

const Admin = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const checkSuperAdminRole = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'superadmin')
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking admin role:', error);
          toast({
            title: "Error",
            description: "No se pudo verificar los permisos de administrador",
            variant: "destructive"
          });
        }

        setIsSuperAdmin(!!data);
      } catch (error) {
        console.error('Error checking admin role:', error);
        setIsSuperAdmin(false);
      } finally {
        setCheckingPermissions(false);
      }
    };

    if (user) {
      checkSuperAdminRole();
    } else if (!loading) {
      setCheckingPermissions(false);
    }
  }, [user, loading, toast]);

  if (loading || checkingPermissions) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    // Preserve source=pwa parameter and add return URL
    const params = new URLSearchParams(location.search);
    const isFromPWA = params.get('source') === 'pwa';
    const authUrl = isFromPWA
      ? '/auth?reason=unauthorized&source=pwa&return=/admin'
      : '/auth?reason=unauthorized&return=/admin';
    return <Navigate to={authUrl} replace />;
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-96">
          <CardHeader className="text-center">
            <Shield className="w-16 h-16 mx-auto text-destructive mb-4" />
            <CardTitle className="text-2xl">Acceso Denegado</CardTitle>
            <CardDescription>
              No tienes permisos de administrador para acceder a esta sección.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Panel de Administración</h1>
              <p className="text-muted-foreground mt-1">
                Gestión completa de usuarios, tenants y analytics
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button asChild variant="outline" className="text-sm">
                <Link to="/dashboard">
                  <Store className="w-4 h-4 mr-2" />
                  Ir al Dashboard
                </Link>
              </Button>
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Admin:</span> {user.email}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="metrics" className="space-y-6">
          <TabsList className="inline-flex w-full md:grid md:grid-cols-9 overflow-x-auto">
            <TabsTrigger value="metrics" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden md:inline">Métricas</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden md:inline">Usuarios</span>
            </TabsTrigger>
            <TabsTrigger value="tenants" className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              <span className="hidden md:inline">Tenants</span>
            </TabsTrigger>
            <TabsTrigger value="domains" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              <span className="hidden md:inline">Dominios</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span className="hidden md:inline">Actividad</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden md:inline">Configuración</span>
            </TabsTrigger>
            <TabsTrigger value="chatbot" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden md:inline">Chatbot</span>
            </TabsTrigger>
            <TabsTrigger value="blog" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden md:inline">Blog</span>
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              <span className="hidden md:inline">WhatsApp</span>
            </TabsTrigger>

          </TabsList>

          <TabsContent value="metrics" className="space-y-6">
            <AdminMetrics />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <AdminUserManagement />
          </TabsContent>

          <TabsContent value="tenants" className="space-y-6">
            <AdminTenantManagement />
          </TabsContent>

          <TabsContent value="domains" className="space-y-6">
            <AdminDomainPurchases />
          </TabsContent>

          <TabsContent value="logs" className="space-y-6">
            <AdminActivityLogs />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <AdminSettings />
          </TabsContent>

          <TabsContent value="chatbot" className="space-y-6">
            <AdminChatbotSettings />
          </TabsContent>

          <TabsContent value="blog" className="space-y-6">
            <BlogContentFixer />
            <AdminBlogEditor />
          </TabsContent>

          <TabsContent value="whatsapp" className="space-y-6">
            <AdminWhatsAppSettings />
          </TabsContent>


        </Tabs>
      </main>
    </div>
  );
};

export default Admin;