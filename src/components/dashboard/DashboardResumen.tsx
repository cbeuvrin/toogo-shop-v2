// @ts-nocheck
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Package, ShoppingCart, Users, DollarSign, TrendingUp, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTenantContext } from '@/contexts/TenantContext';

interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  activeVisitors: number;
  categoriesCount: number;
}

interface SalesData {
  date: string;
  sales: number;
  orders: number;
}

interface TopProduct {
  name: string;
  sales: number;
  revenue: number;
}

const DashboardResumen = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { currentTenantId, isLoading: tenantLoading } = useTenantContext();
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    activeVisitors: 0,
    categoriesCount: 0,
  });
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardStats = async () => {
    try {
      if (!user || !currentTenantId || tenantLoading) return;

      const tenantId = currentTenantId;

      // Fetch products count
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'active');

      // Fetch orders stats
      const { data: orders, count: ordersCount } = await supabase
        .from('orders')
        .select('status, total_usd', { count: 'exact' })
        .eq('tenant_id', tenantId);

      // Calculate revenue and pending orders
      const totalRevenue = orders?.reduce((sum, order) => sum + (Number(order.total_usd) || 0), 0) || 0;
      const pendingOrders = orders?.filter(order => order.status === 'pending').length || 0;

      // Fetch categories count
      const { count: categoriesCount } = await supabase
        .from('categories')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);

      // Fetch active sessions (visitors)
      const { count: activeVisitors } = await supabase
        .from('sessions_realtime')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('state', 'connected');

      setStats({
        totalProducts: productsCount || 0,
        totalOrders: ordersCount || 0,
        pendingOrders,
        totalRevenue,
        activeVisitors: activeVisitors || 0,
        categoriesCount: categoriesCount || 0,
      });

      // Generate mock sales data for the last 7 days
      const mockSalesData: SalesData[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        mockSalesData.push({
          date: date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
          sales: Math.floor(Math.random() * 5000) + 1000,
          orders: Math.floor(Math.random() * 20) + 5,
        });
      }
      setSalesData(mockSalesData);

      // Generate mock top products
      const mockTopProducts: TopProduct[] = [
        { name: "Producto Estrella", sales: 45, revenue: 2250 },
        { name: "Producto Popular", sales: 32, revenue: 1600 },
        { name: "Producto Nuevo", sales: 28, revenue: 1400 },
        { name: "Producto Clásico", sales: 22, revenue: 1100 },
        { name: "Producto Premium", sales: 18, revenue: 1800 },
      ];
      setTopProducts(mockTopProducts);

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las estadísticas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && currentTenantId && !tenantLoading) {
      fetchDashboardStats();
    }
  }, [user, currentTenantId, tenantLoading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Productos",
      value: stats.totalProducts,
      description: "Productos activos",
      icon: Package,
      color: "text-blue-600",
    },
    {
      title: "Órdenes Totales",
      value: stats.totalOrders,
      description: "Todas las órdenes",
      icon: ShoppingCart,
      color: "text-green-600",
    },
    {
      title: "Órdenes Pendientes",
      value: stats.pendingOrders,
      description: "Requieren atención",
      icon: Activity,
      color: "text-orange-600",
    },
    {
      title: "Ingresos Totales",
      value: `$${stats.totalRevenue.toFixed(2)}`,
      description: "Ingresos acumulados",
      icon: DollarSign,
      color: "text-emerald-600",
    },
    {
      title: "Visitantes Activos",
      value: stats.activeVisitors,
      description: "En línea ahora",
      icon: Users,
      color: "text-purple-600",
    },
    {
      title: "Categorías",
      value: stats.categoriesCount,
      description: "Categorías creadas",
      icon: TrendingUp,
      color: "text-indigo-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Resumen de la Tienda</h1>
          <p className="text-muted-foreground">
            Visión general de tu negocio y métricas clave
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          Actualizado hace unos momentos
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Tendencia de Ventas</CardTitle>
            <CardDescription>Ventas e ingresos de los últimos 7 días</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="sales" stroke="#8884d8" strokeWidth={2} />
                <Line type="monotone" dataKey="orders" stroke="#82ca9d" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Products Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Productos Más Vendidos</CardTitle>
            <CardDescription>Top 5 productos por número de ventas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="sales" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Actividad Reciente</CardTitle>
          <CardDescription>Últimas acciones en tu tienda</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Nueva orden recibida</p>
                <p className="text-xs text-muted-foreground">Hace 15 minutos</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Producto actualizado</p>
                <p className="text-xs text-muted-foreground">Hace 1 hora</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Nuevo visitante en la tienda</p>
                <p className="text-xs text-muted-foreground">Hace 2 horas</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardResumen;