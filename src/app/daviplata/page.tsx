
'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import Image from 'next/image';
import { getArticles, createDaviplataOrder, findDaviplataOrder } from '@/app/actions';
import type { Article, CartItem, DaviplataOrderDetail, DaviplataOrder } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, ShoppingCart, QrCode, XCircle, Trash2, CheckCircle, Search, User, FileText, Clock, Edit, ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';


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

type PageState = 'selecting' | 'paying' | 'completed';
type PresenceState = 'consultando' | 'pagando' | 'completado' | 'inactive';

const WhatsAppButton = () => {
    return (
        <a
            href="https://wa.me/573206766574"
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-4 right-4 z-50 flex items-center justify-center w-16 h-16 bg-green-500 rounded-full shadow-lg hover:bg-green-600 transition-transform transform hover:scale-110"
            aria-label="Contactar por WhatsApp"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="w-8 h-8 text-white fill-current"
            >
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.227 1.36.195 1.871.118.571-.078 1.757-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
            </svg>
        </a>
    );
};


export default function DaviplataPublicPage() {
    const { toast } = useToast();
    const [articles, setArticles] = useState<Article[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [pageState, setPageState] = useState<PageState>('selecting');
    const [referenceCode, setReferenceCode] = useState('');
    const [verificationUrl, setVerificationUrl] = useState('');
    
    const [document, setDocument] = useState('');
    const [phone, setPhone] = useState('');
    const [editingOrder, setEditingOrder] = useState<DaviplataOrder | null>(null);
    
    // For order lookup
    const [activeTab, setActiveTab] = useState('new_order');
    const [lookupDocument, setLookupDocument] = useState('');
    const [foundOrders, setFoundOrders] = useState<DaviplataOrder[] | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);

    const daviplataNumber = '320 676 6574';
    
    // For presence tracking
    const sessionId = useRef(uuidv4());

    const fetchArticles = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await getArticles();
            if (error) throw new Error(error);
            setArticles(data || []);
        } catch (err) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los productos.' });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchArticles();
    }, [fetchArticles]);
    
    const reportPresence = useCallback((state: PresenceState) => {
        const data = JSON.stringify({ sessionId: sessionId.current, state });
        // Use sendBeacon for 'inactive' state to ensure it's sent even if the page is closing
        if (state === 'inactive' && navigator.sendBeacon) {
            navigator.sendBeacon('/api/presence', data);
        } else {
            fetch('/api/presence', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: data,
                keepalive: true, // Important for requests during page unload
            });
        }
    }, []);

    // Effect for active presence reporting
    useEffect(() => {
        const mapPageStateToPresenceState = (state: PageState): PresenceState => {
            switch (state) {
                case 'selecting': return 'consultando';
                case 'paying': return 'pagando';
                case 'completed': return 'completado';
                default: return 'consultando';
            }
        };

        const presenceState = mapPageStateToPresenceState(pageState);
        reportPresence(presenceState);

        const intervalId = setInterval(() => reportPresence(presenceState), 15000); // Report every 15 seconds

        const handleBeforeUnload = () => reportPresence('inactive');
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            clearInterval(intervalId);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            // Don't report inactive on unmount if we are navigating within the app
        };
    }, [pageState, reportPresence]);

    // Effect to automatically set state to inactive after completion
    useEffect(() => {
        if (pageState === 'completed') {
            const timeoutId = setTimeout(() => {
                reportPresence('inactive');
            }, 30000); // 30 seconds after completion, mark as inactive

            return () => clearTimeout(timeoutId);
        }
    }, [pageState, reportPresence]);

    
    const displayArticles = useMemo(() => {
        return articles.filter(p => p.visible_cliente);
    }, [articles]);


    const addToCart = (article: Article) => {
        if (!article.activo || (article.stock_disponible !== undefined && article.stock_disponible <= 0)) return;
        setCart(prevCart => {
            const existing = prevCart.find(item => item.id === article.id);
            if (existing) {
                return prevCart.map(item => item.id === article.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prevCart, { ...article, quantity: 1 }];
        });
    };

    const removeFromCart = (articleId: string | number) => {
        setCart(prevCart => {
            const existing = prevCart.find(item => item.id === articleId);
            if (existing && existing.quantity > 1) {
                return prevCart.map(item => item.id === articleId ? { ...item, quantity: item.quantity - 1 } : item);
            }
            return prevCart.filter(item => item.id !== articleId);
        });
    };

    const handleClearCart = () => {
        setCart([]);
        setEditingOrder(null);
    };

    const subtotal = useMemo(() => cart.reduce((acc, item) => acc + item.precio * item.quantity, 0), [cart]);

    const proceedToPayment = () => {
         if (cart.length === 0 || !document.trim() || !phone.trim()) {
            toast({
                variant: 'destructive',
                title: 'Campos requeridos',
                description: 'Por favor, completa tu documento y número de Daviplata para continuar.'
            });
            return;
        }
        if (phone.trim().length !== 10) {
            toast({
                variant: 'destructive',
                title: 'Número de Daviplata inválido',
                description: 'Tu número de celular Daviplata debe tener 10 dígitos.',
            });
            return;
        }
        setPageState('paying');
    }

    const handleConfirmPayment = async () => {
        setIsSubmitting(true);
        try {
            const orderDetails: DaviplataOrderDetail[] = cart.map(item => ({
                producto_id: item.id,
                cantidad: item.quantity,
                precio_unitario: item.precio,
                subtotal: item.precio * item.quantity,
                nombre_producto: item.nombre
            }));

            const result = await createDaviplataOrder(
                orderDetails, 
                subtotal, 
                { document: document, phone: phone },
                editingOrder?.id
            );

            if (result.error || !result.data) throw new Error(result.error || 'No se pudo generar el código.');
            
            const updatedOrder = result.data;

            // If we were editing, update the order in the foundOrders list
            if (editingOrder) {
                setFoundOrders(prev => prev ? prev.map(o => o.id === updatedOrder.id ? updatedOrder : o) : [updatedOrder]);
            }

            const code = updatedOrder.codigo_referencia;
            setReferenceCode(code);
            setVerificationUrl(`${window.location.origin}/verificar-daviplata?codigo=${code}`);
            setPageState('completed');

        } catch (err) {
            toast({ variant: 'destructive', title: 'Error al crear la orden', description: (err as Error).message });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleSearchOrders = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!lookupDocument.trim()) return;

        setIsSearching(true);
        setSearchError(null);
        setFoundOrders(null);

        try {
            const { data, error } = await findDaviplataOrder({type: 'client', value: lookupDocument});
            if (error) throw new Error(error);

            const sortedOrders = (data || []).sort((a, b) => {
                if (a.estado === 'pendiente' && b.estado !== 'pendiente') return -1;
                if (a.estado !== 'pendiente' && b.estado === 'pendiente') return 1;
                return new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime();
            });

            setFoundOrders(sortedOrders);
        } catch (err) {
            setSearchError((err as Error).message);
        } finally {
            setIsSearching(false);
        }
    }
    
    const handleEditOrder = (orderToEdit: DaviplataOrder) => {
        if (orderToEdit.estado !== 'pendiente' || !articles.length) return;
        
        // Move the editing order to the top of the list
        setFoundOrders(prevOrders => {
            if (!prevOrders) return [orderToEdit];
            const otherOrders = prevOrders.filter(o => o.id !== orderToEdit.id);
            return [orderToEdit, ...otherOrders];
        });

        const cartItems: CartItem[] = (orderToEdit.detalles as DaviplataOrderDetail[]).map(detail => {
            const article = articles.find(p => p.id === detail.producto_id);
            return {
                ...article!,
                quantity: detail.cantidad
            };
        }).filter(item => item.id); // Filter out items where article was not found

        setCart(cartItems);
        setDocument(orderToEdit.documento_cliente || '');
        setPhone(orderToEdit.daviplata_cliente || '');
        setEditingOrder(orderToEdit);
        setActiveTab('new_order'); // Switch to the order creation tab
    };

    const handleNewOrder = () => {
        setPageState('selecting');
        setReferenceCode('');
        setVerificationUrl('');
        setCart([]);
        setDocument('');
        setPhone('');
        setEditingOrder(null);
    }
    
    const OrderResultCard = ({order}: {order: DaviplataOrder}) => (
        <Card className="shadow-md">
            <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-base">Orden Cód: <span className="font-mono text-primary">{order.codigo_referencia}</span></CardTitle>
                         <div className="text-xs text-muted-foreground pt-1 flex items-center gap-1">
                            <Clock className="h-3 w-3"/> Creada el {formatDate(order.fecha_creacion)}
                        </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${order.estado === 'pendiente' ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'}`}>
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
            {order.estado === 'pendiente' && (
                <CardFooter>
                    <Button className="w-full" variant="outline" onClick={() => handleEditOrder(order)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar Pedido
                    </Button>
                </CardFooter>
            )}
        </Card>
    );

    if (pageState === 'paying') {
        return (
             <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
                <Card className="w-full max-w-md text-center shadow-2xl">
                    <CardHeader>
                        <div className="flex justify-center items-center gap-4">
                             <Image 
                                src="https://btwhvavwqkzifiuhgcao.supabase.co/storage/v1/object/sign/ventas/Recurso%2010.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8wYzNjNTVjNy1iNTM4LTQ5MDUtYTIwYy04ZjllZmEwZDk2NjEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ2ZW50YXMvUmVjdXJzbyAxMC5wbmciLCJpYXQiOjE3NTM0NTg2MTgsImV4cCI6MTc4NDk5NDYxOH0.jcX2UJMtSQPo8Ny5-tA9dgr4TG_welngcVKqWaLsyJY"
                                alt="Logo"
                                width={64}
                                height={64}
                                className="h-16 w-16"
                             />
                            <CardTitle className="text-2xl font-bold">Realiza tu Pago</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-left space-y-3 p-4 border rounded-lg bg-gray-200 border-gray-300 text-gray-800">
                             <p>1. Abre la app Daviplata y escanea el código QR de abajo o usa el botón "Abrir App".</p>
                            <div className="text-center">
                                <p>2. Ingresa manual y el monto a pagar:</p>
                                <p className="text-xl font-bold text-[#595959]">{formatCurrency(subtotal)}</p>
                            </div>
                             <p>3. Una vez realizado el pago, presiona el botón "¡Listo, ya pagué!" de abajo.</p>
                        </div>
                        
                         <div className="my-4">
                            <p className="text-muted-foreground font-bold">Paga a este número Daviplata:</p>
                            <p className="text-2xl font-bold text-primary whitespace-nowrap">{daviplataNumber}</p>
                        </div>

                         <div className="relative mx-auto w-fit">
                            <Image
                                data-ai-hint="qr code daviplata"
                                src="https://btwhvavwqkzifiuhgcao.supabase.co/storage/v1/object/sign/ventas/Pagos%20Colgemelli.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8wYzNjNTVjNy1iNTM4LTQ5MDUtYTIwYy04ZjllZmEwZDk2NjEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ2ZW50YXMvUGFnb3MgQ29sZ2VtZWxsaS5qcGciLCJpYXQiOjE3NTM0Nzc2OTQsImV4cCI6MTc4NTAxMzY5NH0.w-2t8gH0SLm6paoDRIZRGzAOU3wGeTQMP1n2zDoNS8w"
                                alt="Código QR oficial de Daviplata"
                                width={300}
                                height={300}
                                className="rounded-lg"
                            />
                        </div>
                        <a href="daviplata://app" className='inline-block w-full'>
                            <Button className="w-full" variant="destructive">
                                Abrir App Daviplata
                            </Button>
                        </a>
                         <Button className="w-full h-12 text-base" disabled={isSubmitting} onClick={handleConfirmPayment}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {isSubmitting ? 'Generando orden...' : '¡Listo, ya pagué!'}
                        </Button>
                         <Button onClick={() => setPageState('selecting')} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Volver y editar mi pedido</Button>
                    </CardContent>
                </Card>
            </div>
        )
    }


    if (pageState === 'completed') {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
                <Card className="w-full max-w-md text-center shadow-2xl">
                    <CardHeader>
                         <div className="flex justify-center items-center gap-4">
                             <Image 
                                src="https://btwhvavwqkzifiuhgcao.supabase.co/storage/v1/object/sign/ventas/Recurso%2011.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8wYzNjNTVjNy1iNTM4LTQ5MDUtYTIwYy04ZjllZmEwZDk2NjEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ2ZW50YXMvUmVjdXJzbyAxMS5wbmciLCJpYXQiOjE3NTM0NTg0MjksImV4cCI6MTc1NjA1MDQyOX0.6Zpsd-P75mrhVC8YL-Ckltr-6591PgkKrZ8lOTXNkuQ"
                                alt="Logo"
                                width={64}
                                height={64}
                                className="h-16 w-16"
                             />
                            <CheckCircle className="h-16 w-16 text-green-500" />
                        </div>
                        <CardTitle className="text-2xl font-bold">¡Orden {editingOrder ? 'Actualizada' : 'Generada'}!</CardTitle>
                        <CardDescription>
                           Presenta esta pantalla en cualquier caja para reclamar tus productos.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                            <div className="bg-muted p-4 rounded-lg">
                                <p className="text-sm text-muted-foreground">Tu Código de Referencia:</p>
                                <p className="text-4xl font-bold tracking-widest text-primary break-words">{referenceCode}</p>
                            </div>
                             <div className="bg-muted p-4 rounded-lg flex flex-col items-center">
                                <p className="text-sm text-muted-foreground mb-2">QR para la Caja:</p>
                                {verificationUrl && (
                                     <Image
                                       data-ai-hint="qr code verification"
                                       src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(verificationUrl)}`}
                                       alt="Código QR de verificación para la caja"
                                       width={120}
                                       height={120}
                                       className="rounded-md"
                                    />
                                )}
                            </div>
                        </div>
                        
                        <Alert variant="destructive" className="text-center bg-red-100 border-red-300">
                             <AlertTitle className="text-red-800 font-bold text-lg">¡IMPORTANTE!</AlertTitle>
                             <AlertDescription className="text-red-700 font-semibold">
                                 ¡Dirígete a cualquier caja con esta pantalla para recibir tus vales!
                             </AlertDescription>
                         </Alert>

                    </CardContent>
                </Card>
                <Button variant="outline" className="mt-6" onClick={handleNewOrder}>Crear Nueva Orden</Button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
                <div className="container mx-auto flex h-16 items-center justify-between px-4">
                    <div className="flex items-center gap-3">
                        <Image
                            src="https://btwhvavwqkzifiuhgcao.supabase.co/storage/v1/object/sign/ventas/Logo%20Slogan%20Nuevo%20FINAL-05.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8wYzNjNTVjNy1iNTM4LTQ5MDUtYTIwYy04ZjllZmEwZDk2NjEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ2ZW50YXMvTG9nbyBTbG9nYW4gTnVldm8gRklOQUwtMDUucG5nIiwiaWF0IjoxNzUzNDcyNTc4LCJleHAiOjE3ODUwMDg1Nzh9.y6dTkzYvEWoRLFwk5hcwg4iy1DQJDYqO8VJrrNexypg"
                            alt="Logo Slogan"
                            width={35}
                            height={35}
                            className="object-contain"
                        />
                        <h1 className="text-xl font-bold text-primary">Autogestión Padre de Familia</h1>
                    </div>
                </div>
            </header>
            <main className="container mx-auto p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                     <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="new_order">
                                <ShoppingCart className="mr-2 h-4 w-4" /> Nueva Orden
                            </TabsTrigger>
                            <TabsTrigger value="lookup_order">
                                <Search className="mr-2 h-4 w-4" /> Consultar mis Compras
                            </TabsTrigger>
                          </TabsList>
                          <TabsContent value="new_order" className="pt-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>{editingOrder ? `Editando Pedido ${editingOrder.codigo_referencia}` : 'Selecciona tus Productos'}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {isLoading ? (
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
                                            </div>
                                        ) : displayArticles.length > 0 ? (
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                                {displayArticles.map(article => {
                                                    const isSoldOut = !article.activo || (article.stock_disponible !== undefined && article.stock_disponible <= 0);
                                                    const imageUrl = article.imagen_url || 'https://placehold.co/300x300.png';
                                                    return (
                                                       <Card
                                                            key={article.id}
                                                            className={cn(
                                                                "flex flex-col overflow-hidden transition-shadow",
                                                                !isSoldOut ? "cursor-pointer hover:shadow-lg" : "opacity-60 bg-gray-100 cursor-not-allowed"
                                                            )}
                                                            onClick={() => addToCart(article)}
                                                        >
                                                            <div className="relative aspect-square w-full">
                                                                <Image
                                                                    src={imageUrl}
                                                                    alt={article.nombre}
                                                                    fill
                                                                    sizes="(max-width: 768px) 50vw, 25vw"
                                                                    quality={50}
                                                                    className="object-cover rounded-t-lg"
                                                                />
                                                                {isSoldOut && (
                                                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                                        <p className="text-white font-bold text-lg tracking-wider">AGOTADO</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="p-2 flex-grow flex flex-col justify-between">
                                                                <h3 className="text-sm font-semibold truncate">{article.nombre}</h3>
                                                                <p className="text-primary font-bold">{formatCurrency(article.precio)}</p>
                                                            </div>
                                                        </Card>
                                                    )
                                                })}
                                            </div>
                                         ) : (
                                            <Alert>
                                                <AlertTitle>No hay artículos disponibles</AlertTitle>
                                                <AlertDescription>Por favor, vuelve más tarde.</AlertDescription>
                                            </Alert>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                            <TabsContent value="lookup_order" className="pt-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Consultar mis Compras</CardTitle>
                                        <CardDescription>Ingresa tu número de documento para ver tu historial de compras.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <form onSubmit={handleSearchOrders} className="flex flex-col sm:flex-row gap-2 mb-6">
                                            <Input 
                                                id="lookupDocument" 
                                                placeholder="Tu número de documento" 
                                                value={lookupDocument} 
                                                onChange={e => setLookupDocument(e.target.value)}
                                                disabled={isSearching}
                                                required
                                            />
                                            <Button type="submit" disabled={isSearching || !lookupDocument.trim()} className="w-full sm:w-auto">
                                                {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Search className="mr-2 h-4 w-4" />}
                                                Buscar
                                            </Button>
                                        </form>

                                        {isSearching && (
                                            <div className="text-center p-6"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>
                                        )}
                                        {searchError && (
                                            <Alert variant="destructive">
                                                <AlertTitle>Error</AlertTitle>
                                                <AlertDescription>{searchError}</AlertDescription>
                                            </Alert>
                                        )}
                                        {foundOrders && (
                                            <div className="space-y-4">
                                                {foundOrders.length > 0 ? (
                                                     foundOrders.map(order => <OrderResultCard key={order.id} order={order} />)
                                                ) : (
                                                    <p className="text-center text-muted-foreground py-6">No se encontraron compras para este documento.</p>
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                </div>
                <div className="md:col-span-1">
                    <Card className="sticky top-20">
                        <CardHeader className="p-3">
                             <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <ShoppingCart className="text-accent"/> 
                                    {editingOrder ? 'Editando Pedido' : 'Tu Pedido'}
                                </CardTitle>
                                <div className="flex items-center gap-2">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <ShieldCheck className="h-5 w-5 text-blue-500"/>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Asegurado por IA Molly Colgemelli</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                {cart.length > 0 && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={handleClearCart}
                                      className="h-7 w-7 text-destructive/80 hover:text-destructive"
                                      aria-label="Vaciar pedido"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 p-3">
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                                {cart.length === 0 ? (
                                    <p className="text-muted-foreground text-center py-4">Añade productos para continuar.</p>
                                ) : (
                                    cart.map(item => (
                                        <div key={item.id} className="flex items-center justify-between text-sm">
                                            <div>
                                                <p className="font-medium">{item.nombre}</p>
                                                <p className="text-xs text-muted-foreground">{item.quantity} x {formatCurrency(item.precio)}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold">{formatCurrency(item.precio * item.quantity)}</p>
                                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeFromCart(item.id)}>
                                                    <XCircle className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            {cart.length > 0 && (
                                <>
                                    <hr />
                                    <div className="space-y-4">
                                        <div>
                                            <Label htmlFor="document">Documento</Label>
                                            <Input id="document" placeholder="Tu número de documento" value={document} onChange={e => setDocument(e.target.value)} required/>
                                        </div>
                                        <div>
                                            <Label htmlFor="phone">Nº Daviplata</Label>
                                            <Input 
                                                id="phone" 
                                                placeholder="Tu número de celular (10 dígitos)" 
                                                value={phone} 
                                                onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))} 
                                                maxLength={10}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <hr />
                                    <div className="flex justify-between font-bold text-lg">
                                        <span>Total a Pagar:</span>
                                        <span>{formatCurrency(subtotal)}</span>
                                    </div>
                                    <Button className="w-full" size="lg" disabled={cart.length === 0 || !document.trim() || !phone.trim() || phone.length !== 10} onClick={proceedToPayment}>
                                        <QrCode className="mr-2 h-4 w-4" />
                                        {editingOrder ? 'Actualizar y Pagar' : 'Continuar al Pago'}
                                    </Button>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>
            <WhatsAppButton />
        </div>
    );
}
