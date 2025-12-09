import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { RefreshCw, AlertCircle, CheckCircle2, Clock, Zap } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";

export function AdminDomainPurchases() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [processingDomainId, setProcessingDomainId] = useState<string | null>(null);

  // Eliminar duplicado al cargar el componente
  useEffect(() => {
    const removeDuplicate = async () => {
      const { error } = await supabase
        .from('domain_purchases')
        .delete()
        .eq('id', 'e0fad3d7-fe27-406c-b396-69e2aa252bb5')
        .eq('domain', 'toogoprueba.info');
      
      if (!error) {
        console.log('[ADMIN] Duplicado eliminado exitosamente');
        queryClient.invalidateQueries({ queryKey: ['admin-domains'] });
      }
    };
    removeDuplicate();
  }, [queryClient]);

  const { data: domains, isLoading } = useQuery({
    queryKey: ['admin-domains'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('domain_purchases')
        .select(`
          *,
          tenants (
            id,
            name,
            owner_user_id
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const vercelDiagnosticsMutation = useMutation({
    mutationFn: async () => {
      console.log('[ADMIN] Running Vercel diagnostics...');
      
      const { data, error } = await supabase.functions.invoke('vercel-token-diagnostics');

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.valid) {
        toast({
          title: "✅ Configuración de Vercel válida",
          description: (
            <div className="space-y-2">
              <p>Todas las credenciales están correctas</p>
              <p className="text-xs text-muted-foreground">Team ID: {data.details?.teamId}</p>
              <p className="text-xs text-muted-foreground">Project ID: {data.details?.projectId}</p>
            </div>
          ),
        });
      } else {
        toast({
          title: data.errorCode === 'forbidden' ? "⚠️ Error de scope de Vercel" : "❌ Configuración inválida",
          description: (
            <div className="space-y-2">
              <p className="font-semibold">{data.message}</p>
              <p className="text-xs text-muted-foreground">{data.details}</p>
              {data.suggestion && (
                <p className="text-xs mt-2 font-medium text-blue-600 dark:text-blue-400">
                  💡 {data.suggestion}
                </p>
              )}
            </div>
          ),
          variant: "destructive",
          duration: 12000
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error de conexión",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const validateCredentialsMutation = useMutation({
    mutationFn: async () => {
      console.log('[ADMIN] Validating Openprovider credentials...');
      
      const { data, error } = await supabase.functions.invoke('openprovider-domains', {
        body: { action: 'validate-credentials' }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.status === 'success') {
        toast({
          title: "✅ Credenciales válidas",
          description: `Las credenciales de Openprovider son correctas (${data.username})`,
        });
      } else {
        // Mostrar TODO el detalle del error
        const errorTitle = data.code === 'CONTRACT_NOT_SIGNED' 
          ? "⚠️ Contrato pendiente de firma"
          : data.code === 'AUTHENTICATION_FAILED'
          ? "❌ Credenciales incorrectas"
          : data.code === 'RATE_LIMIT_EXCEEDED'
          ? "⏱️ API temporalmente bloqueada"
          : "❌ Error de validación";

        toast({
          title: errorTitle,
          description: (
            <div className="space-y-2">
              <p className="font-semibold">{data.message}</p>
              {data.details && (
                <p className="text-xs text-muted-foreground mt-2">
                  Detalles técnicos: {data.details}
                </p>
              )}
              {data.code === 'CONTRACT_NOT_SIGNED' && (
                <a 
                  href="https://cp.openprovider.eu/contracts" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs underline text-blue-500 block mt-2"
                >
                  → Ir a firmar contrato en Openprovider
                </a>
              )}
            </div>
          ),
          variant: "destructive",
          duration: 10000
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error de conexión",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const retryMutation = useMutation({
    mutationFn: async ({ domainId, forceAll = false }: { domainId: string, forceAll?: boolean }) => {
      setProcessingDomainId(domainId); // Marcar como procesando
      
      const domain = domains?.find(d => d.id === domainId);
      if (!domain) throw new Error('Domain not found');

      console.log(`[ADMIN] Starting complete setup for domain: ${domain.domain} (forceAll: ${forceAll})`);

      // Si no tiene openprovider_domain_id, primero intentar comprar
      if (!domain.openprovider_domain_id) {
        console.log(`[ADMIN] Domain not purchased yet, attempting purchase first...`);
        
        const { data: purchaseData, error: purchaseError } = await supabase.functions.invoke('openprovider-domains', {
          body: {
            action: 'purchase',
            domain: domain.domain,
            tenantId: domain.tenant_id
          }
        });

        if (purchaseError || purchaseData?.status === 'error') {
          throw new Error(purchaseData?.message || purchaseError?.message || 'Failed to purchase domain');
        }
      }

      // Ejecutar el flujo completo de configuración
      const { data, error } = await supabase.functions.invoke('complete-domain-setup', {
        body: {
          domainPurchaseId: domainId,
          forceAll: forceAll // Permitir forzar todos los pasos
        }
      });

      if (error) throw error;

      return data;
    },
    onSuccess: (data) => {
      setProcessingDomainId(null); // Limpiar estado
      queryClient.invalidateQueries({ queryKey: ['admin-domains'] });
      
      if (!data.success) {
        const errorSteps = data.steps?.filter((s: any) => s.status === 'error') || [];
        toast({
          title: "⚠️ Configuración completada parcialmente",
          description: `${data.summary?.completed || 0} pasos completados, ${errorSteps.length} con errores. Revisa los logs.`,
          variant: "destructive",
          duration: 10000
        });
      } else {
        const summary = data.summary || {};
        toast({
          title: "✅ Configuración completada",
          description: `Dominio ${data.domain} completamente configurado. ${summary.completed} pasos ejecutados, ${summary.skipped} omitidos.`,
          duration: 8000
        });
      }
    },
    onError: (error) => {
      setProcessingDomainId(null); // Limpiar estado
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const forceDnsSetupMutation = useMutation({
    mutationFn: async (domainId: string) => {
      setProcessingDomainId(domainId);
      
      const domain = domains?.find(d => d.id === domainId);
      if (!domain) throw new Error('Domain not found');

      console.log(`[ADMIN] Forcing DNS setup for domain: ${domain.domain}`);

      const { data, error } = await supabase.functions.invoke('complete-domain-setup', {
        body: {
          domainPurchaseId: domainId,
          forceAll: true
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, domainId) => {
      setProcessingDomainId(null);
      queryClient.invalidateQueries({ queryKey: ['admin-domains'] });
      
      const domain = domains?.find(d => d.id === domainId);
      const dnsStep = data.steps?.find((s: any) => s.step === 'vercel_dns_records');
      
      if (dnsStep?.status === 'completed') {
        toast({
          title: "✅ DNS forzados exitosamente",
          description: (
            <div className="space-y-2">
              <p>Registros DNS creados en Vercel para <span className="font-mono">{domain?.domain}</span></p>
              <p className="text-xs text-muted-foreground">A @ → 76.76.21.21</p>
              <p className="text-xs text-muted-foreground">CNAME www → cname.vercel-dns.com</p>
              <p className="text-xs mt-2">⏱️ Espera 5-15 minutos para ver "Valid Configuration" en Vercel</p>
            </div>
          ),
          duration: 10000
        });
      } else {
        toast({
          title: "⚠️ Error al forzar DNS",
          description: dnsStep?.message || "No se pudieron crear los registros DNS",
          variant: "destructive",
          duration: 10000
        });
      }
    },
    onError: (error) => {
      setProcessingDomainId(null);
      toast({
        title: "❌ Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Activo</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pendiente</Badge>;
      case 'dns_pending':
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800">
          <Clock className="w-3 h-3 mr-1" />DNS Pendiente
        </Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Fallido</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Cargando dominios...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Compras de Dominios</CardTitle>
            <CardDescription>
              Gestiona las compras de dominios y reintentos de transacciones fallidas
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => vercelDiagnosticsMutation.mutate()}
              disabled={vercelDiagnosticsMutation.isPending}
              variant="outline"
              size="sm"
            >
              <Zap className={`w-4 h-4 mr-2 ${vercelDiagnosticsMutation.isPending ? 'animate-spin' : ''}`} />
              🔍 Probar Token de Vercel
            </Button>
            <Button
              onClick={() => validateCredentialsMutation.mutate()}
              disabled={validateCredentialsMutation.isPending}
              variant="outline"
              size="sm"
            >
              <CheckCircle2 className={`w-4 h-4 mr-2 ${validateCredentialsMutation.isPending ? 'animate-spin' : ''}`} />
              Validar Openprovider
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dominio</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>DNS</TableHead>
              <TableHead>Código Error</TableHead>
              <TableHead>Intentos</TableHead>
              <TableHead>Errores</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {domains?.map((domain) => {
              const metadata = (domain.metadata as any) || {};
              const retryCount = metadata.retry_count || 0;
              const errorHistory = metadata.error_history || [];
              const errorCode = metadata.error_code;

              return (
                <TableRow key={domain.id}>
                  <TableCell className="font-mono text-sm">{domain.domain}</TableCell>
                  <TableCell>{domain.tenants?.name || 'N/A'}</TableCell>
                  <TableCell>{getStatusBadge(domain.status)}</TableCell>
                  <TableCell>
                    {domain.dns_verified_bool ? (
                      <Badge variant="outline" className="bg-green-50">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-green-600" />
                        Verificado
                      </Badge>
                    ) : (
                      <Badge variant="outline">Pendiente</Badge>
                    )}
                    
                    {domain.status === 'dns_pending' && (
                      <div className="text-xs text-amber-600 mt-1">
                        <p>⏳ NS delegados - Esperando Vercel</p>
                        <p className="text-[10px]">
                          Intento {domain.dns_check_attempts || 0}/10 • Reintento en ~15 min
                        </p>
                      </div>
                    )}

                    {metadata?.email_sent && (
                      <div className="text-[10px] text-green-600 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Email enviado: {new Date(metadata.email_sent_at).toLocaleDateString('es-MX', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {errorCode ? (
                      <Badge variant="outline" className="text-xs">
                        {errorCode}
                      </Badge>
                    ) : '-'}
                  </TableCell>
                  <TableCell>{retryCount > 0 ? retryCount : '-'}</TableCell>
                  <TableCell>
                    {errorHistory && errorHistory.length > 0 ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 px-2">
                            <AlertCircle className="w-4 h-4 mr-1" />
                            Ver errores ({errorHistory.length})
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
                          {errorHistory.map((err: any, idx: number) => (
                            <DropdownMenuItem key={idx} className="flex flex-col items-start py-3 cursor-default">
                              <div className="text-xs text-muted-foreground mb-1">
                                {new Date(err.timestamp).toLocaleString('es-MX')}
                              </div>
                              <div className="text-sm">{err.error}</div>
                              {err.step && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Paso: {err.step}
                                </div>
                              )}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(domain.created_at).toLocaleDateString('es-MX')}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-2">
                      {/* Botón FORZAR DNS - Siempre visible */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => forceDnsSetupMutation.mutate(domain.id)}
                        disabled={processingDomainId === domain.id}
                        className="gap-1"
                      >
                        <Zap className={`w-3 h-3 ${processingDomainId === domain.id ? 'animate-pulse' : ''}`} />
                        Forzar DNS
                      </Button>

                      {/* Botones condicionales existentes */}
                      {(domain.status === 'pending' || domain.status === 'failed') && (
                        <>
                          {errorCode === 'CONTRACT_NOT_SIGNED' ? (
                            <div className="space-y-2">
                              <Badge variant="destructive" className="text-xs">
                                Acción requerida
                              </Badge>
                              <a 
                                href="https://cp.openprovider.eu/contracts" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs underline text-blue-500 block"
                              >
                                Firmar contrato →
                              </a>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => retryMutation.mutate({ domainId: domain.id })}
                              disabled={processingDomainId === domain.id}
                            >
                              <RefreshCw className={`w-4 h-4 mr-1 ${processingDomainId === domain.id ? 'animate-spin' : ''}`} />
                              Reintentar
                            </Button>
                          )}
                        </>
                      )}
                      
                      {domain.status === 'active' && !domain.dns_verified_bool && !metadata.setup_completed_at && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => retryMutation.mutate({ domainId: domain.id, forceAll: false })}
                          disabled={processingDomainId === domain.id}
                        >
                          <CheckCircle2 className={`w-4 h-4 mr-1 ${processingDomainId === domain.id ? 'animate-spin' : ''}`} />
                          Completar Setup
                        </Button>
                      )}
                      
                      {domain.status === 'active' && !domain.dns_verified_bool && metadata.setup_completed_at && (
                        <div className="flex flex-col gap-1">
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            <Clock className="w-3 h-3 mr-1" />
                            Esperando propagación DNS
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            24-48 horas
                          </span>
                        </div>
                      )}

                      {/* Botón Reenviar Email - solo si DNS verificado pero email no enviado */}
                      {domain.dns_verified_bool && !metadata?.email_sent && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              const { data: tenant } = await supabase
                                .from('tenants')
                                .select('owner_user_id')
                                .eq('id', domain.tenant_id)
                                .single();
                              
                              if (!tenant) {
                                sonnerToast.error('Tenant no encontrado');
                                return;
                              }

                              const { data: user } = await supabase.auth.admin.getUserById(tenant.owner_user_id);
                              
                              if (!user?.user?.email) {
                                sonnerToast.error('Email de usuario no encontrado');
                                return;
                              }

                              await supabase.functions.invoke('send-store-ready-notification', {
                                body: { 
                                  domain: domain.domain, 
                                  email: user.user.email, 
                                  tenantId: domain.tenant_id 
                                }
                              });
                              
                              sonnerToast.success('Email enviado correctamente');
                              queryClient.invalidateQueries({ queryKey: ['admin-domains'] });
                            } catch (error) {
                              console.error('Error sending email:', error);
                              sonnerToast.error('Error al enviar email');
                            }
                          }}
                          className="text-xs"
                        >
                          📧 Enviar Email
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {domains?.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  No hay compras de dominios registradas
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
