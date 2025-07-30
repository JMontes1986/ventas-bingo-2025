
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { LogOut, Tags, LayoutDashboard, Settings, Star, AlertTriangle, ShoppingBag, Undo2, RefreshCw, Users, ShieldCheck, Sparkles, CreditCard, QrCode, MessageSquare, Search, Loader2, CheckCircle, FileText, Phone, Clock, X, Package } from 'lucide-react';
import useAuth from '@/hooks/useAuth';
import { getArticles, getDashboardData, getSalesByArticle, getAllReturns, toggleArticleAvailability, countPendingDaviplataConversations, findDaviplataOrder, completeDaviplataOrder, recordSaleTransactional, getCashierWarning, countCompletedDaviplataOrders, getPendingDaviplataOrders } from '@/app/actions';
import type { Article, CartItem, SaleData, Cajero, VentaConDetalles, ReturnDetail, DaviplataOrder, DaviplataOrderDetail, ArticleSale, ActiveDaviplataUsers, CashierWarningOutput, DashboardData } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import ArticleCard from '@/components/ArticleCard';
import Cart from '@/components/Cart';
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PromotionsTab from '@/components/PromotionsTab';
import ReturnsCard from '@/components/ReturnsCard';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ArticleStats {
  directSales: number;
  promoSales: number;
  returns: number;
  stock?: number;
  reserved?: number;
}

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
        return format(date, "d MMM, h:mm a", { locale: es });
    } catch (e) {
        return dateString;
    }
};

const OrderVerificationResultCard = ({ order, onComplete, isCompleting }: { order: DaviplataOrder, onComplete: (order: DaviplataOrder) => void, isCompleting: boolean }) => (
    <Card className="mt-4 animate-in fade-in-50">
        <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle className="text-base">Orden Cód: <span className="font-mono text-primary">{order.codigo_referencia}</span></CardTitle>
                    {(order.documento_cliente || order.daviplata_cliente) && (
                        <div className="text-xs text-muted-foreground pt-1 flex items-center gap-2">
                            {order.documento_cliente && <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{order.documento_cliente}</span>}
                            {order.daviplata_cliente && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {order.daviplata_cliente}</span>}
                        </div>
                    )}
                    <div className="text-xs text-muted-foreground pt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Creada a las {formatDate(order.fecha_creacion)}
                    </div>
                </div>
                <span className={cn('px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap', order.estado === 'pendiente' ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800')}>
                    {order.estado}
                </span>
            </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                    <AccordionTrigger className="text-sm py-2">Ver Detalles ({formatCurrency(order.total)})</AccordionTrigger>
                    <AccordionContent>
                        <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside">
                            {(order.detalles as DaviplataOrderDetail[]).map((item, index) => (
                                <li key={index}>
                                    <span className="font-medium text-foreground">{item.cantidad}x</span> {item.nombre_producto} ({formatCurrency(item.precio_unitario)} c/u)
                                </li>
                            ))}
                        </ul>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </CardContent>
        <CardFooter>
            {order.estado === 'pendiente' ? (
                <Button className="w-full" size="lg" onClick={() => onComplete(order)} disabled={isCompleting}>
                    {isCompleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                    {isCompleting ? "Completando..." : "Confirmar Pago y Entregar Vales"}
                </Button>
            ) : (
                <div className="text-center font-semibold text-green-600 p-2 bg-green-100 rounded-lg w-full">
                    Esta orden ya fue completada.
                </div>
            )}
        </CardFooter>
    </Card>
);

const CashierAlert = ({ alert }: { alert: CashierWarningOutput | null }) => {
    if (!alert || !alert.alerta_activa) {
        return null;
    }

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger>
                    <div className="flex items-center gap-2 text-red-600 font-bold animate-pulse">
                        <AlertTriangle className="h-5 w-5" />
                        <span className="hidden lg:inline">{alert.mensaje}</span>
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{alert.mensaje}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};


export default function SalesPage() {
  const { user, logout, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [articles, setArticles] = useState<Article[]>([]);
  const [articleSales, setArticleSales] = useState<ArticleSale[]>([]);
  const [returns, setReturns] = useState<ReturnDetail[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingConversations, setPendingConversations] = useState(0);
  const [activeDaviplataUsers, setActiveDaviplataUsers] = useState<ActiveDaviplataUsers>({ total: 0, states: { consultando: 0, pagando: 0, completado: 0 } });
  const [completedDaviplataCount, setCompletedDaviplataCount] = useState(0);
  const [cashierWarning, setCashierWarning] = useState<CashierWarningOutput | null>(null);
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [quickCheckCode, setQuickCheckCode] = useState('');
  const [quickCheckResult, setQuickCheckResult] = useState<DaviplataOrder | null>(null);
  const [quickCheckLoading, setQuickCheckLoading] = useState(false);
  const [quickCheckError, setQuickCheckError] = useState<string | null>(null);
  const [isCompletingQuickCheck, setIsCompletingQuickCheck] = useState(false);

  const individualArticles = useMemo(() => {
    let filteredArticles = articles.filter(p => !p.nombre.toLowerCase().startsWith('promoción'));
    
    if (user?.username.toLowerCase() === 'entrada') {
      return filteredArticles.filter(p => p.nombre.toLowerCase() === 'entrada');
    }
    return filteredArticles;
  }, [articles, user]);

  const promotionArticles = useMemo(() => {
    let filteredPromos = articles.filter(p => p.nombre.toLowerCase().startsWith('promoción'));
     if (user?.username.toLowerCase() === 'entrada') {
      return [];
    }
    return filteredPromos;
  }, [articles, user]);
  
  const refreshAllData = useCallback(async (isManualRefresh = false) => {
    if (!user) return;
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    
    try {
        const [articlesResult, salesByArticleResult, returnsResult, convResult] = await Promise.all([
            getArticles(),
            getSalesByArticle(),
            getAllReturns(),
            user.can_access_ai_analysis ? countPendingDaviplataConversations(user) : Promise.resolve({count: 0, error: null})
        ]);

        const errors = [articlesResult.error, salesByArticleResult.error, returnsResult.error, convResult.error].filter(Boolean);
        if (errors.length > 0) {
            throw new Error(errors.join('; '));
        }

        setArticles(articlesResult.data || []);
        setArticleSales(salesByArticleResult.data || []);
        setReturns(returnsResult.data || []);
        setPendingConversations(convResult.count || 0);

        if (isManualRefresh) {
            toast({ title: "Datos actualizados", description: "La información ha sido refrescada." });
        }
    } catch(err) {
        toast({ variant: "destructive", title: "Error al refrescar", description: (err as Error).message });
    } finally {
        if (isManualRefresh) setIsRefreshing(false);
        else setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
        refreshAllData(false);
    }
  }, [user, refreshAllData]);

    useEffect(() => {
        if (!user) return;
        
        const presenceInterval = setInterval(async () => {
            try {
                const response = await fetch('/api/presence');
                if (!response.ok) throw new Error(`API call failed with status ${response.status}`);
                const presenceData: ActiveDaviplataUsers = await response.json();
                setActiveDaviplataUsers(presenceData);
                
                const completedResult = await countCompletedDaviplataOrders();
                if (completedResult.error) throw new Error(completedResult.error);
                setCompletedDaviplataCount(completedResult.count);

                if(user.can_access_dashboard || user.username.toLowerCase() === 'caja1' || user.username.toLowerCase() === 'caja2' || user.username.toLowerCase() === 'administrador') {
                    const [dashboardDataRes, pendingOrdersRes] = await Promise.all([
                        getDashboardData(),
                        getPendingDaviplataOrders(),
                    ]);
                    const warning = await getCashierWarning(presenceData, dashboardDataRes.data, pendingOrdersRes.data);
                    setCashierWarning(warning);
                }

            } catch (e) {
                console.error("Failed to fetch presence or cashier warning:", e);
            }
        }, 15000); // Check every 15 seconds

        return () => {
          clearInterval(presenceInterval);
        };
    }, [user]);


  const getArticleStats = useCallback((article: Article): ArticleStats => {
    const sale = articleSales.find(s => s.producto_id === article.id);
    const returnCount = returns.filter(r => r.producto_id === article.id).reduce((acc, r) => acc + r.cantidad, 0);
    
    const relatedPromoSales = articleSales
      .filter(s => s.nombre.toLowerCase().startsWith('promoción') && s.nombre.toLowerCase().includes(article.nombre.toLowerCase()))
      .reduce((acc, current) => acc + current.total_vendido, 0);

    const totalSold = sale?.total_vendido || 0;
    const netDirectSales = totalSold - returnCount;

    return {
        directSales: netDirectSales > 0 ? netDirectSales : 0,
        promoSales: relatedPromoSales, 
        returns: returnCount,
        stock: article.stock_disponible,
        reserved: article.stock_reservado
    };
  }, [articleSales, returns]);


  const addToCart = (article: Article) => {
     if(!article.activo || (article.stock_disponible !== undefined && article.stock_disponible <= 0)) {
        toast({
            variant: "destructive",
            title: "Sin Stock",
            description: `El artículo "${article.nombre}" está agotado.`
        });
        return;
    }
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === article.id);
      if (existingItem) {
        return prevCart.map((item) =>
          item.id === article.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...article, quantity: 1 }];
    });
  };

  const handleRecordSale = useCallback(async (cashReceived: number, paymentMethod: 'Efectivo' | 'Daviplata') => {
    if (!user || cart.length === 0) return;
    
    setIsSubmitting(true);
    const originalCart = [...cart];
    const subtotal = cart.reduce((acc, item) => acc + item.precio * item.quantity, 0);
    
    const saleData: SaleData = {
      venta: {
        cajero_id: user.id,
        subtotal: subtotal,
        efectivo_recibido: paymentMethod === 'Efectivo' ? cashReceived : subtotal,
        cambio: paymentMethod === 'Efectivo' ? cashReceived - subtotal : 0,
        metodo_pago: paymentMethod,
      },
      detalles: cart.map(item => ({
        producto_id: item.id,
        cantidad: item.quantity,
        precio_unitario: item.precio,
        subtotal: item.precio * item.quantity
      })),
    };

    try {
      setCart([]);
      const result = await recordSaleTransactional(saleData, user as Cajero);
      
      if (result.success) {
        toast({
          title: "Venta registrada",
          description: "La venta se ha guardado correctamente.",
        });
        await refreshAllData(true);
      } else {
        setCart(originalCart); 
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al registrar la venta",
        description: (error as Error).message || "Ocurrió un error inesperado. Por favor, recargue la página para asegurar la consistencia de los datos.",
      });
      setCart(originalCart);
    } finally {
      setIsSubmitting(false);
    }
  }, [user, cart, toast, refreshAllData]);

  const getItemsInCart = (articleId: string) => {
      const item = cart.find(i => String(i.id) === articleId);
      return item ? item.quantity : 0;
  }
  
  const handleQuickCheckSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!quickCheckCode.trim()) return;

        setQuickCheckLoading(true);
        setQuickCheckError(null);
        setQuickCheckResult(null);

        try {
            const { data, error } = await findDaviplataOrder({ type: 'code', value: quickCheckCode });
            if (error) throw new Error(error);
            if (!data || data.length === 0) {
                 setQuickCheckError('No se encontró ninguna orden con ese código.');
                 return;
            }
            const order = data[0];

            if (user?.username.toLowerCase() === 'entrada') {
                const details = typeof order.detalles === 'string' ? JSON.parse(order.detalles) : order.detalles;
                const hasEntrada = details.some((d: DaviplataOrderDetail) => d.nombre_producto.toLowerCase() === 'entrada');
                if (!hasEntrada) {
                    setQuickCheckError("Esta orden no incluye 'Entrada'. Debe ser verificada en una caja principal.");
                    return;
                }
            }

            setQuickCheckResult(order);
        } catch (err) {
            setQuickCheckError((err as Error).message);
        } finally {
            setQuickCheckLoading(false);
        }
    };

    const handleQuickCompleteOrder = async (order: DaviplataOrder) => {
        if (!user) return;
        setIsCompletingQuickCheck(true);
        try {
            const result = await completeDaviplataOrder(order.id, user as Cajero);
            if(result.error) throw new Error(result.error);

            toast({
                title: 'Venta Completada',
                description: `La orden ${order.codigo_referencia} ha sido registrada como venta.`,
            });
            
            setQuickCheckResult(prev => prev ? { ...prev, estado: 'completada' } : null);
            await refreshAllData(true);
            
        } catch (err) {
             toast({
                variant: 'destructive',
                title: 'Error al completar la venta',
                description: (err as Error).message,
            });
        } finally {
            setIsCompletingQuickCheck(false);
        }
    };


  if (authLoading || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-16 w-48" />
          <span className="text-muted-foreground">Cargando...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const NavButton = ({ href, children, tooltipText, badgeCount }: { href: string; children: React.ReactNode; tooltipText: string, badgeCount?: number }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" className="h-8 w-8 p-0 relative" asChild>
            <Link href={href}>
              {children}
              {badgeCount && badgeCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-bold">
                  {badgeCount}
                </span>
              )}
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
  
  const PresenceIndicator = ({ count, icon: Icon, colorClass, tooltipText }: { count: number; icon: React.ElementType; colorClass: string, tooltipText: string }) => (
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger>
                <div className={cn("flex items-center gap-1 transition-colors", count > 0 && "font-bold", colorClass)}>
                   <Icon className={cn("h-4 w-4", count > 0 && "animate-pulse")}/>
                   <span>{count}</span>
                </div>
            </TooltipTrigger>
            <TooltipContent>
                <p>{tooltipText}</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
  );

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-2 md:px-4">
          <div className="relative h-[35px] w-[150px]">
            <Image 
              src="https://btwhvavwqkzifiuhgcao.supabase.co/storage/v1/object/sign/ventas/Logo%20Slogan%20Nuevo%20FINAL-05.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8wYzNjNTVjNy1iNTM4LTQ5MDUtYTIwYy04ZjllZmEwZDk2NjEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ2ZW50YXMvTG9nbyBTbG9nYW4gTnVldm8gRklOQUwtMDUucG5nIiwiaWF0IjoxNzUzNDcwMzEwLCJleHAiOjE3ODUwMDYzMTB9.Q40fD7lHdUFbkADI5zIL_L-DLFrKH2yGGJ75KreeIjw" 
              alt="Logo" 
              fill
              className="object-contain"
              priority
              sizes="150px"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
             <div className="flex items-center gap-2 md:gap-3 text-xs text-muted-foreground border-r pr-2 md:pr-3 mr-1">
                 <CashierAlert alert={cashierWarning} />
                <span className="hidden md:inline">Cajero: {user.nombre_completo}</span>
                <div className="flex items-center gap-2">
                    <PresenceIndicator count={activeDaviplataUsers.states.consultando} icon={Search} colorClass="text-blue-500" tooltipText="Padres consultando" />
                    <PresenceIndicator count={activeDaviplataUsers.states.pagando} icon={QrCode} colorClass="text-orange-500" tooltipText="Padres pagando" />
                    <PresenceIndicator count={completedDaviplataCount} icon={CheckCircle} colorClass="text-green-500" tooltipText="Padres verificados en caja" />
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refreshAllData(true)} disabled={isRefreshing}>
                          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Refrescar Datos</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
            </div>
            <div className="flex items-center gap-2">
                {user.can_verify_daviplata && (
                     <NavButton href="/verificar-daviplata" tooltipText="Verificar Daviplata">
                        <QrCode className="h-4 w-4" />
                    </NavButton>
                )}
                {user.can_access_dashboard && (
                     <NavButton href="/dashboard" tooltipText="Dashboard">
                        <LayoutDashboard className="h-4 w-4" />
                    </NavButton>
                )}
                {user.can_access_ai_analysis && (
                    <>
                         <NavButton href="/dashboard/ai-analysis" tooltipText="Análisis IA">
                            <Sparkles className="h-4 w-4" />
                        </NavButton>
                        <NavButton href="/dashboard/ia-button" tooltipText="Botón IA" badgeCount={pendingConversations}>
                           <MessageSquare className="h-4 w-4" />
                        </NavButton>
                    </>
                )}
                 {user.can_view_logs && (
                     <NavButton href="/dashboard/logs" tooltipText="Logs">
                        <ShieldCheck className="h-4 w-4" />
                    </NavButton>
                 )}
                 {user.can_access_articles && (
                     <NavButton href="/articles" tooltipText="Artículos">
                        <Settings className="h-4 w-4" />
                    </NavButton>
                 )}
                {user.can_access_cajeros && (
                     <NavButton href="/cajeros" tooltipText="Cajeros">
                        <Users className="h-4 w-4" />
                    </NavButton>
                 )}
                 <TooltipProvider>
                   <Tooltip>
                       <TooltipTrigger asChild>
                            <Button variant="outline" className="h-8 w-8 p-0" onClick={logout}>
                               <LogOut className="h-4 w-4" />
                           </Button>
                       </TooltipTrigger>
                       <TooltipContent>
                           <p>Salir</p>
                       </TooltipContent>
                   </Tooltip>
                </TooltipProvider>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-2 flex-grow flex flex-col md:flex-row md:gap-4">
        <aside className="w-full md:w-2/5 space-y-4 order-1 md:order-2 md:sticky md:top-20 h-fit">
           <Cart
              cartItems={cart}
              setCart={setCart}
              onRecordSale={handleRecordSale}
              isSubmitting={isSubmitting}
            />
            {user && user.can_view_returns && (
              <ReturnsCard articles={articles} user={user} onReturnSuccess={() => refreshAllData(true)} />
            )}
        </aside>

        <section className="flex-grow md:w-3/5 space-y-4 order-2 md:order-1">
          <Card>
             <CardHeader className="p-3">
               <Tabs defaultValue="articles" className="w-full">
                <TabsList className={`grid w-full ${user.username.toLowerCase() === 'entrada' ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  <TabsTrigger value="articles">
                    <Package className="mr-2 h-4 w-4"/>
                    Artículos
                  </TabsTrigger>
                  {user.username.toLowerCase() !== 'entrada' && (
                    <TabsTrigger value="promotions">
                      <Star className="mr-2 h-4 w-4"/>
                      Promociones
                    </TabsTrigger>
                  )}
                </TabsList>
                <TabsContent value="articles" className="pt-4">
                  {error && (
                    <Card className="mb-4 border-destructive bg-destructive/10">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive text-base">
                            <AlertTriangle/> Error al cargar artículos
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                          <p className="text-destructive/90 text-sm">{error}</p>
                      </CardContent>
                    </Card>
                  )}
                   <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {isLoading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="flex flex-col space-y-2">
                          <Skeleton className="h-[100px] w-full rounded-lg" />
                          <div className="space-y-1">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                          </div>
                        </div>
                      ))
                    ) : individualArticles.length > 0 ? (
                      individualArticles.map((article) => (
                        <ArticleCard 
                          key={article.id}
                          article={article}
                          stats={getArticleStats(article)}
                          onAddToCart={addToCart}
                        />
                      ))
                    ) : !error ? (
                         <div className="col-span-full text-center py-10 text-muted-foreground">
                            <p>No se encontraron artículos.</p>
                            <p className="text-xs">Los artículos pueden estar cargando o no se han añadido al sistema.</p>
                        </div>
                    ) : null}
                  </div>
                </TabsContent>
                {user.username.toLowerCase() !== 'entrada' && (
                  <TabsContent value="promotions" className="pt-4">
                    <PromotionsTab
                      promotions={promotionArticles}
                      onAddToCart={addToCart}
                      getItemsInCart={getItemsInCart}
                     />
                  </TabsContent>
                )}
              </Tabs>
            </CardHeader>
          </Card>
           <Button asChild variant="outline" className="w-full md:hidden">
                <Link href="/daviplata">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Pagar con Daviplata (Público)
                </Link>
           </Button>
        </section>
      </main>
      
      {user.can_verify_daviplata && (
        <footer className="container mx-auto p-2">
             <Card className="border-green-500">
                <CardHeader>
                    <CardTitle>Verificación Rápida Daviplata</CardTitle>
                    <CardDescription>Busca una orden por su código de 6 dígitos.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form className="flex gap-2" onSubmit={handleQuickCheckSearch}>
                        <Input
                            type="text"
                            placeholder="Ej: 123456"
                            value={quickCheckCode}
                            onChange={(e) => setQuickCheckCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                            className="text-lg font-mono tracking-widest"
                            maxLength={6}
                            disabled={quickCheckLoading || isCompletingQuickCheck}
                        />
                        <Button
                            type="submit"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            disabled={!quickCheckCode || quickCheckLoading || isCompletingQuickCheck}
                        >
                            {quickCheckLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                            Buscar
                        </Button>
                         {quickCheckResult && (
                             <Button variant="ghost" onClick={() => { setQuickCheckResult(null); setQuickCheckCode(''); setQuickCheckError(null); }}>
                                <X className="h-4 w-4" />
                             </Button>
                         )}
                    </form>
                    <div className="mt-4">
                        {quickCheckLoading && <div className="text-center p-4"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>}
                        {quickCheckError && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{quickCheckError}</AlertDescription>
                            </Alert>
                        )}
                        {quickCheckResult && (
                            <OrderVerificationResultCard 
                                order={quickCheckResult}
                                onComplete={handleQuickCompleteOrder}
                                isCompleting={isCompletingQuickCheck}
                            />
                        )}
                    </div>
                </CardContent>
            </Card>
        </footer>
      )}
    </div>
  );
}
