
'use client';

import React, { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import jsQR from 'jsqr';
import useAuth from '@/hooks/useAuth';
import { findDaviplataOrder, completeDaviplataOrder, getPendingDaviplataOrders } from '@/app/actions';
import type { DaviplataOrder, Cajero, DaviplataOrderDetail } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Search, QrCode, Loader2, AlertTriangle, CheckCircle, User, Phone, Video, VideoOff, Clock, FileText, X, ListChecks } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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
        // e.g., "25 jul, 10:30 AM"
        return format(date, "d MMM, h:mm a", { locale: es });
    } catch (e) {
        return dateString;
    }
};

const OrderCard = ({order, onComplete, isCompleting}: {order: DaviplataOrder, onComplete: (order: DaviplataOrder) => void, isCompleting: boolean}) => (
    <Card key={order.id} className="shadow-md">
        <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle>Orden Cód: <span className="font-mono text-primary">{order.codigo_referencia}</span></CardTitle>
                    {(order.documento_cliente || order.daviplata_cliente) && (
                        <div className="text-xs text-muted-foreground pt-1 flex items-center gap-2">
                            {order.documento_cliente && <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{order.documento_cliente}</span>}
                            {order.daviplata_cliente && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {order.daviplata_cliente}</span>}
                        </div>
                    )}
                     <div className="text-xs text-muted-foreground pt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3"/> Creada a las {formatDate(order.fecha_creacion)}
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
        <CardFooter className="flex-col gap-2">
                {order.estado === 'pendiente' ? (
                <>
                    <p className="text-sm text-muted-foreground text-center">
                        Por favor, confirma en el Daviplata del colegio que se haya recibido un pago por este monto.
                    </p>
                    <Button className="w-full" size="lg" onClick={() => onComplete(order)} disabled={isCompleting}>
                        {isCompleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                        {isCompleting ? "Completando..." : "Confirmar Pago y Entregar Vales"}
                    </Button>
                </>
                ) : (
                    <div className="text-center font-semibold text-green-600 p-4 bg-green-100 rounded-lg w-full">
                        Esta orden ya fue completada.
                    </div>
                )}
        </CardFooter>
    </Card>
);


function VerifyDaviplataPageContent() {
    const { user, loading: authLoading } = useAuth({ requiredPermission: 'can_verify_daviplata' });
    const { toast } = useToast();
    const searchParams = useSearchParams();

    const [activeTab, setActiveTab] = useState('code');
    const [searchInput, setSearchInput] = useState('');
    const [foundOrders, setFoundOrders] = useState<DaviplataOrder[]>([]);
    const [pendingOrders, setPendingOrders] = useState<DaviplataOrder[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingPending, setIsLoadingPending] = useState(false);
    const [isCompleting, setIsCompleting] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pendingError, setPendingError] = useState<string | null>(null);
    
    // QR Scanner State
    const [isScanning, setIsScanning] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const fetchPendingOrders = useCallback(async () => {
        setIsLoadingPending(true);
        setPendingError(null);
        try {
            const { data, error } = await getPendingDaviplataOrders();
            if (error) throw new Error(error);
            setPendingOrders(data || []);
        } catch (err) {
            setPendingError((err as Error).message);
            setPendingOrders([]);
        } finally {
            setIsLoadingPending(false);
        }
    }, []);

    const handleSearch = useCallback(async (type: 'code' | 'client' = 'code', value?: string) => {
        const searchValue = value || searchInput;
        if (!searchValue) return;
        setIsLoading(true);
        setError(null);
        setFoundOrders([]);
        try {
            const { data, error } = await findDaviplataOrder({ type, value: searchValue });
            if (error) throw new Error(error);
            setFoundOrders(data || []);
             if (!data || data.length === 0) {
                setError('No se encontró ninguna orden con ese identificador.');
            }
        } catch (err) {
            setError((err as Error).message);
            setFoundOrders([]);
        } finally {
            setIsLoading(false);
        }
    }, [searchInput]);
    
    useEffect(() => {
        const codeFromUrl = searchParams.get('codigo');
        if (codeFromUrl) {
            setSearchInput(codeFromUrl);
            setActiveTab('code');
            handleSearch('code', codeFromUrl);
        }
    }, [searchParams, handleSearch]);

    const clearSearch = () => {
        setSearchInput('');
        setFoundOrders([]);
        setError(null);
    };
    
    const handleTabChange = (newTab: string) => {
        setActiveTab(newTab);
        clearSearch();
        stopScan();

        if (newTab === 'pending') {
            fetchPendingOrders();
        }
    };


    const handleCompleteOrder = async (order: DaviplataOrder) => {
        if (!user) return;
        setIsCompleting(order.id);
        try {
            const result = await completeDaviplataOrder(order.id, user as Cajero);
            if(result.error) throw new Error(result.error);

            toast({
                title: 'Venta Completada',
                description: `La orden ${order.codigo_referencia} ha sido registrada como venta.`,
            });
            // Refresh both lists
            setFoundOrders(prev => prev.map(o => o.id === order.id ? {...o, estado: 'completada'} : o));
            await fetchPendingOrders();

        } catch (err) {
             toast({
                variant: 'destructive',
                title: 'Error al completar la venta',
                description: (err as Error).message,
            });
        } finally {
            setIsCompleting(null);
        }
    }
    
    const startScan = async () => {
        setIsScanning(true);
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            setError("No se pudo acceder a la cámara. Revisa los permisos.");
            setIsScanning(false);
        }
    };

    const stopScan = useCallback(() => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setIsScanning(false);
    }, []);

    const tick = useCallback(() => {
        if (isScanning && videoRef.current?.readyState === videoRef.current?.HAVE_ENOUGH_DATA) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    canvas.height = video.videoHeight;
                    canvas.width = video.videoWidth;
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const code = jsQR(imageData.data, imageData.width, imageData.height, {
                        inversionAttempts: "dontInvert",
                    });

                    if (code) {
                        try {
                            const url = new URL(code.data);
                            const codigo = url.searchParams.get('codigo');
                            if(codigo) {
                                setSearchInput(codigo);
                                setActiveTab('code');
                                handleSearch('code', codigo);
                            } else {
                                setError("El QR no contiene un código de verificación válido.");
                            }
                        } catch (e) {
                             setError("El QR no contiene una URL válida.");
                        }
                        stopScan();
                    }
                }
            }
        }
        if (isScanning) {
            requestAnimationFrame(tick);
        }
    }, [isScanning, stopScan, handleSearch]);

    useEffect(() => {
        if (isScanning) {
            requestAnimationFrame(tick);
        }
        return () => {
            stopScan();
        }
    }, [isScanning, tick, stopScan]);


    if (authLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="space-y-4 p-8 w-full max-w-2xl">
                    <Skeleton className="h-10 w-1/3" />
                    <Skeleton className="h-32 w-full" />
                </div>
            </div>
        );
    }
    
    if (!user) return null;

    const renderResults = () => {
        if (isLoading) {
            return <div className="text-center p-6"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>;
        }
        if (error) {
            return (
                 <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            );
        }
        if (foundOrders.length > 0) {
            return (
                <div className="space-y-4">
                    {foundOrders.map(order => (
                         <OrderCard 
                            key={order.id} 
                            order={order} 
                            onComplete={handleCompleteOrder}
                            isCompleting={isCompleting === order.id}
                        />
                    ))}
                </div>
            );
        }
        return null;
    }

    const renderPendingList = () => {
        if (isLoadingPending) {
             return <div className="text-center p-6"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>;
        }
         if (pendingError) {
            return (
                 <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error al cargar pendientes</AlertTitle>
                    <AlertDescription>{pendingError}</AlertDescription>
                </Alert>
            );
        }
         if (pendingOrders.length > 0) {
            return (
                <div className="space-y-4">
                    {pendingOrders.map(order => (
                         <OrderCard 
                            key={order.id} 
                            order={order} 
                            onComplete={handleCompleteOrder}
                            isCompleting={isCompleting === order.id}
                        />
                    ))}
                </div>
            );
        }

        return (
            <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                    No hay órdenes pendientes en este momento.
                </CardContent>
            </Card>
        );
    }
    
    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
                <div className="container mx-auto flex h-16 items-center justify-between px-4">
                    <h1 className="text-xl font-bold text-primary flex items-center gap-2">
                        <QrCode /> Verificar Pago Daviplata
                    </h1>
                    <Button asChild variant="outline">
                        <Link href="/">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Ventas
                        </Link>
                    </Button>
                </div>
            </header>
            <main className="container mx-auto p-4 max-w-2xl space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Buscar Orden</CardTitle>
                        <CardDescription>
                            Busca la orden del cliente usando uno de los métodos disponibles.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                       <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                          <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="code"><QrCode className="mr-2 h-4 w-4" />Código</TabsTrigger>
                            <TabsTrigger value="client"><User className="mr-2 h-4 w-4"/>Cliente</TabsTrigger>
                            <TabsTrigger value="qr"><Video className="mr-2 h-4 w-4"/>QR</TabsTrigger>
                            <TabsTrigger value="pending"><ListChecks className="mr-2 h-4 w-4"/>Pendientes</TabsTrigger>
                          </TabsList>
                          <TabsContent value="code" className="pt-4">
                              <p className="text-sm text-muted-foreground mb-2">Ingresa el código de 6 dígitos para una búsqueda específica.</p>
                              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); handleSearch('code'); }}>
                                  <Input
                                      type="text"
                                      placeholder="Ej: 123456"
                                      value={searchInput}
                                      onChange={(e) => setSearchInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                                      className="text-lg font-mono tracking-widest"
                                      maxLength={6}
                                      disabled={isLoading || isCompleting !== null}
                                  />
                                  <Button type="submit" disabled={!searchInput || isLoading || isCompleting !== null}>
                                      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                                      Buscar
                                  </Button>
                              </form>
                               <div className="mt-4">{renderResults()}</div>
                          </TabsContent>
                          <TabsContent value="client" className="pt-4">
                              <p className="text-sm text-muted-foreground mb-2">Ingresa el número de documento o Daviplata del cliente.</p>
                              <form className="flex gap-2" onSubmit={(e) => {e.preventDefault(); handleSearch('client'); }}>
                                  <Input
                                      type="text"
                                      placeholder="Documento o Nº Daviplata"
                                      value={searchInput}
                                      onChange={(e) => setSearchInput(e.target.value)}
                                      className="text-base"
                                      disabled={isLoading || isCompleting !== null}
                                  />
                                  <Button type="submit" disabled={!searchInput || isLoading || isCompleting !== null}>
                                      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <User className="mr-2 h-4 w-4" />}
                                      Buscar
                                  </Button>
                              </form>
                               <div className="mt-4">{renderResults()}</div>
                          </TabsContent>
                          <TabsContent value="qr" className="pt-4">
                                {isScanning ? (
                                    <div className="space-y-2">
                                        <video ref={videoRef} className="w-full aspect-video rounded-md" autoPlay playsInline />
                                        <canvas ref={canvasRef} className="hidden" />
                                        <Button onClick={stopScan} variant="destructive" className="w-full">
                                            <VideoOff className="mr-2 h-4 w-4" /> Detener Escáner
                                        </Button>
                                    </div>
                                ) : (
                                    <Button onClick={startScan} className="w-full">
                                        <Video className="mr-2 h-4 w-4" /> Iniciar Escáner QR
                                    </Button>
                                )}
                                <div className="mt-4">{renderResults()}</div>
                          </TabsContent>
                           <TabsContent value="pending" className="pt-4">
                               {renderPendingList()}
                           </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}

// Esto es necesario para que el hook `useSearchParams` funcione correctamente con SSR/Next.js App Router
export default function VerifyDaviplataPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center">Cargando...</div>}>
            <VerifyDaviplataPageContent />
        </Suspense>
    )
}
