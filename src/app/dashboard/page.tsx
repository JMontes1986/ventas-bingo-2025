
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import useAuth from '@/hooks/useAuth';
import { getDashboardData, getSalesByArticle, getAllReturns } from '@/app/actions';
import type { DashboardData, ArticleSale, ReturnDetail } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, DollarSign, ShoppingBag, AlertTriangle, Settings, Package, Search, Undo2, X, BarChart, CreditCard, Banknote, Star, ShieldCheck, Sparkles, Users, MessageSquare, Hourglass, Zap } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Bar, BarChart as RechartsBarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const formatCurrency = (value: number) => {
    if (typeof value !== 'number') return '$0';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
};

const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return format(date, "d MMM, yyyy 'a las' h:mm a", { locale: es });
    } catch (e) {
        return dateString;
    }
};

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth({ requiredPermission: 'can_access_dashboard' });
  const router = useRouter();
  
  const [generalData, setGeneralData] = useState<DashboardData | null>(null);
  const [articleSales, setArticleSales] = useState<ArticleSale[]>([]);
  const [returns, setReturns] = useState<ReturnDetail[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
        setLoading(true);
        setError(null);
        
        const [dashboardResult, salesByArticleResult, returnsResult] = await Promise.all([
            getDashboardData(),
            getSalesByArticle(),
            getAllReturns(),
        ]);

        const errors = [dashboardResult.error, salesByArticleResult.error, returnsResult.error].filter(Boolean);
        if (errors.length > 0) {
            const unifiedError = errors.join('; ');
            console.error('Error fetching dashboard data:', unifiedError);
            setError(unifiedError);
        } else {
            setGeneralData(dashboardResult.data);
            setArticleSales(salesByArticleResult.data || []);
            setReturns(returnsResult.data || []);
        }

    } catch (err) {
      console.error('Caught exception while fetching dashboard data:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
        fetchData();
    }
  }, [user, fetchData]);


  const chartData = useMemo(() => {
    return articleSales
      .filter(p => !p.nombre.toLowerCase().startsWith('promoción') && p.recaudo_total > 0)
      .map(p => ({
        name: p.nombre.length > 15 ? `${p.nombre.substring(0, 12)}...` : p.nombre,
        'Recaudo Total': p.recaudo_total,
    })).sort((a, b) => b['Recaudo Total'] - a['Recaudo Total']);
  }, [articleSales]);
  
  const promotionSales = useMemo(() => {
    return articleSales.filter(p => p.nombre.toLowerCase().startsWith('promoción'));
  }, [articleSales]);
  
  const promotionSalesTotal = useMemo(() => {
    return promotionSales.reduce((acc, promo) => acc + promo.recaudo_total, 0);
  }, [promotionSales]);

  if (authLoading || (loading && !generalData)) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="space-y-4 p-8 w-full max-w-7xl">
            <h1 className="text-3xl font-bold text-primary">Cargando Dashboard...</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
            </div>
            <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!user) return null; // Should be redirected by the hook

  return (
    <div className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
            <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
                <h1 className="text-2xl font-bold text-primary">
                    Dashboard de Administrador
                </h1>
                <div className="flex items-center gap-2">
                     {user.can_access_ai_analysis && (
                        <>
                            <Button variant="outline" size="sm" asChild>
                                <Link href="/dashboard/ai-analysis">
                                    <Sparkles className="mr-1 h-4 w-4" />
                                    <span className="hidden md:inline">Análisis con IA</span>
                                </Link>
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                                <Link href="/dashboard/ia-button">
                                    <MessageSquare className="mr-1 h-4 w-4" />
                                    <span className="hidden md:inline">Botón IA</span>
                                </Link>
                            </Button>
                        </>
                     )}
                     {user.can_access_articles && (
                        <Button variant="outline" size="sm" asChild>
                        <Link href="/articles">
                            <Settings className="mr-1 h-4 w-4" />
                            <span className="hidden md:inline">Artículos</span>
                        </Link>
                        </Button>
                     )}
                     {user.can_view_logs && (
                        <Button variant="outline" size="sm" asChild>
                        <Link href="/dashboard/logs">
                            <ShieldCheck className="mr-1 h-4 w-4" />
                            <span className="hidden md:inline">Logs</span>
                        </Link>
                        </Button>
                     )}
                     {user.can_access_cajeros && (
                        <Button variant="outline" size="sm" asChild>
                            <Link href="/cajeros">
                                <Users className="mr-1 h-4 w-4" />
                                <span className="hidden md:inline">Cajeros</span>
                            </Link>
                        </Button>
                     )}
                     <Button variant="outline" onClick={() => router.push('/')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver a Ventas
                    </Button>
                </div>
            </div>
      </header>
      <main className="container mx-auto p-4 md:p-6 space-y-6">
        {error && (
             <Card className="border-destructive bg-destructive/10">
                <CardHeader>
                    <div className="flex items-center gap-2 text-destructive font-semibold text-lg">
                        <AlertTriangle/> Error al Cargar Datos
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-destructive/90">No se pudieron cargar los datos del dashboard. Por favor, revisa tu conexión a internet y la configuración del entorno (variables de entorno).</p>
                    <pre className="mt-2 p-2 bg-black/10 rounded-md text-destructive whitespace-pre-wrap text-sm">
                        <code>{error}</code>
                    </pre>
                </CardContent>
            </Card>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <Card className="border-blue-600">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="text-sm font-medium">Total Recaudado (Neto)</div>
                    <DollarSign className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{generalData ? formatCurrency(generalData.total_revenue) : <Skeleton className="h-8 w-3/4"/>}</div>
                    <p className="text-xs text-muted-foreground">
                        {generalData?.total_returns ? `Después de devoluciones` : 'Calculando...'}
                    </p>
                </CardContent>
            </Card>
            <Card className="border-green-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="text-sm font-medium">Total Efectivo (Neto)</div>
                    <Banknote className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                     <div className="text-2xl font-bold">{generalData ? formatCurrency(generalData.total_efectivo): <Skeleton className="h-8 w-1/2"/>}</div>
                     <p className="text-xs text-muted-foreground">Ya incluye devoluciones</p>
                </CardContent>
            </Card>
             <Card className="border-yellow-500">
                 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="text-sm font-medium">Total Autogestión (Daviplata)</div>
                    <CreditCard className="h-4 w-4 text-yellow-500" />
                 </CardHeader>
                 <CardContent>
                    <div className="text-2xl font-bold">{generalData ? formatCurrency(generalData.total_daviplata): <Skeleton className="h-8 w-1/2"/>}</div>
                    <p className="text-xs text-muted-foreground">Este valor está incluido en el total</p>
                </CardContent>
            </Card>
            <Card className="border-purple-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="text-sm font-medium">Total Ventas Promociones</div>
                    <Star className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{generalData ? formatCurrency(promotionSalesTotal): <Skeleton className="h-8 w-1/2"/>}</div>
                    <p className="text-xs text-muted-foreground">Incluido en el recaudo total</p>
                </CardContent>
            </Card>
            <Card className="border-destructive">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 text-destructive">
                    <div className="text-sm font-medium">Total en Devoluciones</div>
                    <Undo2 className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-destructive">
                        {generalData ? formatCurrency(generalData.total_returns) : <Skeleton className="h-8 w-1/2"/>}
                    </div>
                    <p className="text-xs text-destructive/80">Ya descontado del recaudo</p>
                </CardContent>
            </Card>
        </div>
        
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="text-sm font-medium">T. Promedio Verificación Davi</div>
                    <Hourglass className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {generalData ? (
                            generalData.avg_daviplata_verification_time !== null ? 
                            `${generalData.avg_daviplata_verification_time.toFixed(1)} min` 
                            : 'N/A'
                        ) : <Skeleton className="h-8 w-1/2"/>}
                    </div>
                    <p className="text-xs text-muted-foreground">Desde pago a entrega</p>
                </CardContent>
            </Card>
             <Card className="lg:col-span-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="text-sm font-medium">Ventas por Caja</div>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {generalData?.sales_by_cajero ? (
                        <ul className="space-y-1 pt-2">
                            {generalData.sales_by_cajero.map(cajero => (
                                <li key={cajero.nombre} className="flex justify-between items-center text-sm">
                                    <span className="font-medium text-muted-foreground">{cajero.nombre}</span>
                                    <span className="font-bold">{formatCurrency(cajero.total)}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="space-y-2 pt-2">
                            <Skeleton className="h-5 w-full"/>
                            <Skeleton className="h-5 w-full"/>
                        </div>
                    )}
                </CardContent>
            </Card>
            <Card className="lg:col-span-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="text-sm font-medium">Eficiencia por Caja (Tiempo Promedio)</div>
                    <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                     {generalData?.avg_sale_time_by_cajero ? (
                        <ul className="space-y-1 pt-2">
                            {generalData.avg_sale_time_by_cajero.map(cajero => (
                                <li key={cajero.nombre} className="flex justify-between items-center text-sm">
                                    <span className="font-medium text-muted-foreground">{cajero.nombre}</span>
                                    <span className="font-bold">{cajero.avg_time_seconds.toFixed(1)} seg</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="space-y-2 pt-2">
                            <Skeleton className="h-5 w-full"/>
                            <Skeleton className="h-5 w-full"/>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle>Ventas por Artículo (Individual)</CardTitle>
                <CardDescription>Recaudo neto por cada artículo, sin incluir promociones asociadas. Ordenado de mayor a menor.</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={{}} className="min-h-[300px] w-full">
                    <ResponsiveContainer width="100%" height={400}>
                        <RechartsBarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                            <XAxis dataKey="name" tickLine={false} axisLine={false} stroke="hsl(var(--foreground))"/>
                            <YAxis tickFormatter={(value) => formatCurrency(Number(value))} stroke="hsl(var(--foreground))"/>
                            <Tooltip
                                cursor={{ fill: 'hsla(var(--muted))' }}
                                content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value) as any)} />}
                            />
                            <Bar dataKey="Recaudo Total" radius={[4, 4, 0, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                ))}
                            </Bar>
                        </RechartsBarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>

       <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Star className="text-accent" />
                    Ventas por Promoción (Individual)
                </CardTitle>
                 <CardDescription>
                    Recaudo total generado únicamente por ítems de promoción. Este valor ya está incluido en las métricas generales.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {promotionSales.length > 0 ? (
                    <div className="space-y-4">
                        <div className="bg-primary/10 p-4 rounded-lg">
                             <h4 className="text-md font-semibold mb-2 text-center text-primary">Desglose por Promoción</h4>
                             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {promotionSales.map(promo => (
                                    <Card key={promo.producto_id} className="text-center">
                                        <CardHeader className="p-2 pb-0">
                                            <CardTitle className="text-sm font-normal">{promo.nombre}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-2">
                                            <p className="font-bold text-primary">{formatCurrency(promo.recaudo_total)}</p>
                                            <p className="text-xs text-muted-foreground">{promo.total_vendido} vendidas</p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-10 text-muted-foreground">
                        <p>No se han registrado ventas de promociones todavía.</p>
                    </div>
                )}
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2 text-lg font-semibold">
                    <Undo2 className="text-destructive" />
                    Historial de Devoluciones
                </div>
                 <CardDescription>Lista de todos los artículos que han sido devueltos.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-full"/>
                        <Skeleton className="h-8 w-full"/>
                        <Skeleton className="h-8 w-full"/>
                    </div>
                ) : returns.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Artículo</TableHead>
                                <TableHead className="text-center">Cantidad</TableHead>
                                <TableHead className="text-right">Monto Devuelto</TableHead>
                                <TableHead>Cajero</TableHead>
                                <TableHead>Fecha</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {returns.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.producto_nombre}</TableCell>
                                    <TableCell className="text-center">{item.cantidad}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.monto_devolucion)}</TableCell>
                                    <TableCell>{item.cajero_nombre}</TableCell>
                                    <TableCell>{formatDate(item.fecha_devolucion)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="text-center py-10 text-muted-foreground">
                        <p>No se han registrado devoluciones todavía.</p>
                    </div>
                )}
            </CardContent>
        </Card>
      </main>
    </div>
  );
}
