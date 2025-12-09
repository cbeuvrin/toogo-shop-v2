import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BarChart3, TrendingUp, Users, MessageCircle, DollarSign, Package, Download, Calendar, Crown, Loader2, AlertCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { usePlanRestrictions } from "@/hooks/usePlanRestrictions";
import { useTenantContext } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, subDays } from "date-fns";
import { GA4_PROPERTY_ID } from "@/lib/constants";

export const DashboardAnalytics = () => {
  const { restrictions, plan } = usePlanRestrictions();
  const { currentTenantId } = useTenantContext();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState("7d");
  const [isLoading, setIsLoading] = useState(true);
  
  // Real data states
  const [salesData, setSalesData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [trafficSources, setTrafficSources] = useState<any[]>([]);
  
  // GA4 specific states
  const [ga4Data, setGa4Data] = useState<any>(null);
  const [ga4Loading, setGa4Loading] = useState(false);
  const [ga4Error, setGa4Error] = useState<string | null>(null);

  useEffect(() => {
    if (currentTenantId) {
      fetchAnalyticsData();
    }
  }, [currentTenantId, dateRange]);

  const getDaysCount = () => {
    switch (dateRange) {
      case "7d": return 7;
      case "30d": return 30;
      case "90d": return 90;
      case "1y": return 365;
      default: return 7;
    }
  };

  const fetchGA4Data = async () => {
    if (!currentTenantId) return;
    
    try {
      setGa4Loading(true);
      setGa4Error(null);
      
      const days = getDaysCount();
      const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
      const endDate = format(new Date(), 'yyyy-MM-dd');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const { data, error } = await supabase.functions.invoke('fetch-ga4-analytics', {
        body: {
          tenantId: currentTenantId,
          startDate,
          endDate,
          propertyId: GA4_PROPERTY_ID,
        },
      });

      if (error) throw error;

      console.log('[GA4] Data received:', data);
      setGa4Data(data);

      // Update traffic sources if we have data
      if (data.trafficSources && data.trafficSources.length > 0) {
        const colors = {
          'Direct': '#8884d8',
          'Organic Search': '#82ca9d',
          'Organic Social': '#1877F2',
          'Referral': '#ffc658',
          'Paid Search': '#ff7c7c',
        };

        const formattedSources = data.trafficSources.map((source: any) => ({
          name: source.source,
          value: source.sessions,
          color: colors[source.source as keyof typeof colors] || '#999999',
        }));

        setTrafficSources(formattedSources);
      }
    } catch (error: any) {
      console.error('[GA4] Error fetching analytics:', error);
      setGa4Error(error.message || 'Error al obtener datos de GA4');
      
      // Set default empty data
      setGa4Data({
        sessions: 0,
        newUsers: 0,
        bounceRate: 0,
        averageSessionDuration: 0,
        pageViews: 0,
        trafficSources: [],
      });
    } finally {
      setGa4Loading(false);
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      setIsLoading(true);
      const days = getDaysCount();
      const startDate = subDays(new Date(), days);

      // Fetch orders data
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*, order_items(qty, product_id)')
        .eq('tenant_id', currentTenantId)
        .gte('created_at', startDate.toISOString());

      if (ordersError) throw ordersError;

      // Fetch sessions data (if exists)
      const { data: sessions } = await supabase
        .from('sessions_realtime')
        .select('*')
        .eq('tenant_id', currentTenantId)
        .gte('connected_at', startDate.toISOString());

      // Process sales data by day
      const salesByDay: Record<string, { sales: number; visits: number; messages: number }> = {};
      
      for (let i = 0; i < days; i++) {
        const date = format(subDays(new Date(), days - i - 1), 'yyyy-MM-dd');
        salesByDay[date] = { sales: 0, visits: 0, messages: 0 };
      }

      let totalRevenue = 0;
      let totalProductsSold = 0;
      const productSales: Record<string, { name: string; sales: number; revenue: number }> = {};

      orders?.forEach(order => {
        const date = format(new Date(order.created_at), 'yyyy-MM-dd');
        
        // Solo contar órdenes pagadas
        if (order.status === 'paid') {
          if (salesByDay[date]) {
            salesByDay[date].sales += order.total_mxn || 0;
          }
          totalRevenue += order.total_mxn || 0;

          order.order_items?.forEach((item: any) => {
            totalProductsSold += item.qty;
          });
        }
      });

      sessions?.forEach(session => {
        const date = format(new Date(session.connected_at), 'yyyy-MM-dd');
        if (salesByDay[date]) {
          salesByDay[date].visits += 1;
        }
      });

      // Fetch products for top sellers
      const { data: products } = await supabase
        .from('products')
        .select('id, title, price_mxn')
        .eq('tenant_id', currentTenantId);

      // Calculate top products (solo órdenes pagadas)
      orders?.forEach(order => {
        if (order.status === 'paid') {
          order.order_items?.forEach((item: any) => {
            const product = products?.find(p => p.id === item.product_id);
            if (product) {
              if (!productSales[product.id]) {
                productSales[product.id] = {
                  name: product.title,
                  sales: 0,
                  revenue: 0
                };
              }
              productSales[product.id].sales += item.qty;
              productSales[product.id].revenue += (product.price_mxn || 0) * item.qty;
            }
          });
        }
      });

      // Convert to arrays
      const salesDataArray = Object.entries(salesByDay).map(([date, data]) => ({
        date: format(new Date(date), 'MMM dd'),
        ...data
      }));

      const topProductsArray = Object.values(productSales)
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5);

      setSalesData(salesDataArray);
      setTopProducts(topProductsArray);

      // Calculate metrics
      const totalOrders = orders?.length || 0;
      const paidOrders = orders?.filter(o => o.status === 'paid').length || 0;
      
      // Fetch GA4 data in parallel
      fetchGA4Data();

      setMetrics([{
        title: "Ventas Totales",
        value: `$${totalRevenue.toFixed(2)}`,
        change: "+0%",
        trend: "up",
        icon: DollarSign,
        color: "text-green-600"
      }, {
        title: "Visitantes (GA4)",
        value: ga4Loading ? "..." : (ga4Data?.sessions || 0).toString(),
        change: "+0%",
        trend: "up",
        icon: Users,
        color: "text-blue-600"
      }, {
        title: "Órdenes",
        value: totalOrders.toString(),
        change: "+0%",
        trend: "up",
        icon: MessageCircle,
        color: "text-green-600"
      }, {
        title: "Productos Vendidos",
        value: totalProductsSold.toString(),
        change: "+0%",
        trend: "up",
        icon: Package,
        color: "text-purple-600"
      }]);

    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las analíticas",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  const exportData = () => {
    // In a real app, this would generate and download a CSV/Excel file
    console.log("Exporting analytics data...");
  };
  return <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Analíticas</h3>
          <p className="text-sm text-muted-foreground">
            Estadísticas y métricas de tu tienda
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 días</SelectItem>
              <SelectItem value="30d">Últimos 30 días</SelectItem>
              <SelectItem value="90d">Últimos 3 meses</SelectItem>
              <SelectItem value="1y">Último año</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            onClick={exportData}
            disabled={!restrictions.canExportData}
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar
            {!restrictions.canExportData && (
              <Crown className="w-3 h-3 ml-1" />
            )}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(metric => <Card key={metric.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {metric.title}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">{metric.value}</p>
                    <Badge variant={metric.trend === "up" ? "default" : "destructive"} className="text-xs">
                      {metric.change}
                    </Badge>
                  </div>
                </div>
                <metric.icon className={`w-8 h-8 ${metric.color}`} />
              </div>
            </CardContent>
          </Card>)}
      </div>

      {/* Pro Plan Notice */}
      {!restrictions.hasAdvancedAnalytics && (
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Crown className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-orange-900 mb-1">
                  Analytics Básico (Plan Gratuito)
                </h4>
                <p className="text-sm text-orange-700 mb-3">
                  Estás viendo las métricas básicas. Actualiza al Plan Basic para acceder a analytics avanzado, 
                  exportación de datos y métricas detalladas por producto.
                </p>
                <Button 
                  size="sm" 
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  Actualizar a Basic - $299 MXN/mes
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Tendencia de Ventas
            </CardTitle>
            <CardDescription>
              Evolución de ventas en los últimos días
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="sales" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Traffic Sources */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Fuentes de Tráfico (Google Analytics 4)
              {ga4Loading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
            </CardTitle>
            <CardDescription>
              De dónde vienen tus visitantes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ga4Error && (
                <Alert variant="default" className="bg-yellow-50 border-yellow-200">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-sm text-yellow-800">
                    Los datos de GA4 pueden tardar 24-48 horas en aparecer después de la instalación.
                    <br />
                    <span className="text-xs">Error: {ga4Error}</span>
                  </AlertDescription>
                </Alert>
              )}

              {!ga4Loading && trafficSources.length === 0 && (
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-sm text-blue-800">
                    📊 Esperando datos de Google Analytics 4. Los datos aparecerán una vez que haya tráfico en tu tienda.
                  </AlertDescription>
                </Alert>
              )}

              {trafficSources.length > 0 && (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie 
                      data={trafficSources} 
                      cx="50%" 
                      cy="50%" 
                      outerRadius={80} 
                      fill="#8884d8" 
                      dataKey="value" 
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {trafficSources.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        {restrictions.hasAdvancedAnalytics ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Productos Más Vendidos
              </CardTitle>
              <CardDescription>
                Los productos con mejor rendimiento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topProducts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="sales" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gray-50 border-dashed border-2 border-gray-300">
            <CardContent className="p-6 text-center">
              <Crown className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <h4 className="font-medium text-gray-600 mb-2">Productos Más Vendidos</h4>
              <p className="text-sm text-gray-500 mb-3">
                Disponible en el Plan Basic
              </p>
              <Button size="sm" variant="outline">
                Actualizar Plan
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Visitor Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Estadísticas de Visitantes
            </CardTitle>
            <CardDescription>
              Tráfico y mensajes por día
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="visits" fill="#82ca9d" />
                <Bar dataKey="messages" fill="#ffc658" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      {restrictions.hasAdvancedAnalytics && (
        <Card>
          <CardHeader>
            <CardTitle>Productos Detallados</CardTitle>
            <CardDescription>
              Rendimiento individual de cada producto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Producto</th>
                    <th className="text-left p-2">Ventas</th>
                    <th className="text-left p-2">Ingresos</th>
                    <th className="text-left p-2">Visitas</th>
                    <th className="text-left p-2">Tasa de conversión</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((product, index) => <tr key={index} className="border-b">
                      <td className="p-2 font-medium">{product.name}</td>
                      <td className="p-2">{product.sales}</td>
                      <td className="p-2">${product.revenue}</td>
                      <td className="p-2">{Math.floor(product.sales * 5.5)}</td>
                      <td className="p-2">
                        <Badge variant="outline">
                          {Math.floor(product.sales / (product.sales * 5.5) * 100)}%
                        </Badge>
                      </td>
                    </tr>)}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>;
};