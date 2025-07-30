
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useAuth from '@/hooks/useAuth';
import { getAuditLogs } from '@/app/actions';
import type { AuditLog } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, AlertTriangle, ShieldCheck, Users } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return format(date, "d MMM, yyyy 'a las' h:mm:ss a", { locale: es });
    } catch (e) {
        return dateString;
    }
};

const getActionVariant = (action: string) => {
    if (action.includes('FALLID')) return 'destructive';
    if (action.includes('CREADO') || action.includes('VENTA') || action.includes('COMPLETADA')) return 'default';
    if (action.includes('ACTUALIZADO') || action.includes('DEVOLUCION') || action.includes('LOGIN')) return 'secondary';
    if (action.includes('IA_ALERTA') || action.includes('INCONSISTENTE')) return 'destructive';
    return 'outline';
}

export default function AuditLogPage() {
    const { user, loading: authLoading } = useAuth({ requiredPermission: 'can_view_logs' });
    const router = useRouter();
    const { toast } = useToast();
    
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchLogs = useCallback(async () => {
        if (!user) return;
        try {
            setLoading(true);
            setError(null);
            const result = await getAuditLogs();
            if (result.error) throw new Error(result.error);
            setLogs(result.data || []);
        } catch (err) {
            console.error('Error fetching audit logs:', err);
            setError((err as Error).message);
            setLogs([]); // Ensure logs is an array on error
            toast({
                variant: 'destructive',
                title: 'Error al cargar los registros',
                description: 'No se pudo cargar la auditoría. Por favor, intente de nuevo.'
            });
        } finally {
            setLoading(false);
        }
    }, [toast, user]);
    
    useEffect(() => {
        if (user) {
            fetchLogs();
        }
    }, [user, fetchLogs]);


    if (authLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="space-y-4 p-8 w-full max-w-6xl">
                    <Skeleton className="h-10 w-1/3" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-96 w-full" />
                </div>
            </div>
        );
    }
    
    if (!user) return null;

    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
                <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
                    <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
                        <ShieldCheck /> Logs de Auditoría
                    </h1>
                     <div className="flex items-center gap-2">
                        {user.can_access_cajeros && (
                            <Button variant="outline" size="sm" asChild>
                                <Link href="/cajeros">
                                    <Users className="mr-1 h-4 w-4" />
                                    Cajeros
                                </Link>
                            </Button>
                        )}
                        <Button variant="outline" onClick={() => router.push('/dashboard')}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Volver al Dashboard
                        </Button>
                    </div>
                </div>
            </header>
            <main className="container mx-auto p-4 md:p-6">
                {error && (
                    <Card className="mb-6 border-destructive bg-destructive/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-destructive">
                                <AlertTriangle/> Error de Carga
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-destructive/90">No se pudieron cargar los registros de auditoría.</p>
                            <pre className="mt-2 p-2 bg-black/10 rounded-md text-destructive whitespace-pre-wrap text-sm">
                                <code>{error}</code>
                            </pre>
                        </CardContent>
                    </Card>
                )}
                <Card>
                    <CardHeader>
                        <CardTitle>Últimos 500 Eventos Registrados</CardTitle>
                        <CardDescription>
                            Aquí se muestran las acciones más recientes realizadas en el sistema.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha y Hora</TableHead>
                                    <TableHead>Cajero</TableHead>
                                    <TableHead>Acción</TableHead>
                                    <TableHead>Descripción</TableHead>
                                    <TableHead>Dirección IP</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: 10 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : logs.length > 0 ? (
                                    logs.map(log => (
                                        <TableRow key={log.id}>
                                            <TableCell className="text-xs text-muted-foreground">{formatDate(log.fecha_evento)}</TableCell>
                                            <TableCell className="font-medium">{log.cajero_nombre}</TableCell>
                                            <TableCell>
                                                <Badge variant={getActionVariant(log.accion)}>
                                                    {log.accion}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm">{log.descripcion}</TableCell>
                                            <TableCell className="text-xs font-mono text-muted-foreground">{log.ip_address}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                                            No se encontraron registros de auditoría.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}
