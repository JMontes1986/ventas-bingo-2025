
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import useAuth from '@/hooks/useAuth';
import { getCajeros, createCajero, updateCajero } from '@/app/actions';
import type { Cajero, CajeroFormData } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Edit, PlusCircle, AlertTriangle, Check, X, Users, QrCode } from 'lucide-react';
import CajeroFormDialog from '@/components/CajeroFormDialog';

const PermissionIndicator = ({ allowed }: { allowed: boolean }) => {
    return allowed ? (
        <Check className="h-5 w-5 text-green-500" />
    ) : (
        <X className="h-5 w-5 text-destructive" />
    );
};

export default function CajeroManagementPage() {
    const { user, loading: authLoading } = useAuth({ requiredPermission: 'can_access_cajeros' });
    const { toast } = useToast();
    
    const [cajeros, setCajeros] = useState<Cajero[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCajero, setEditingCajero] = useState<Cajero | null>(null);

    const fetchCajeros = useCallback(async () => {
        if (!user) return;
        try {
            setLoading(true);
            setError(null);
            const result = await getCajeros(user);
            
            if (result.error) throw new Error(result.error);
            
            setCajeros(result.data || []);

        } catch (err) {
            console.error('Error fetching data:', err);
            setError((err as Error).message);
            toast({
                variant: 'destructive',
                title: 'Error al cargar los datos',
                description: 'No se pudieron cargar los cajeros.'
            });
        } finally {
            setLoading(false);
        }
    }, [toast, user]);
    
    useEffect(() => {
        if (user) {
            fetchCajeros();
        }
    }, [user, fetchCajeros]);

    const handleOpenNewDialog = () => {
        setEditingCajero(null);
        setIsDialogOpen(true);
    };

    const handleOpenEditDialog = (cajero: Cajero) => {
        setEditingCajero(cajero);
        setIsDialogOpen(true);
    };

    const handleFormSubmit = async (formData: CajeroFormData) => {
        if (!user) {
            toast({ variant: 'destructive', title: 'Error de autenticación' });
            return;
        }

        try {
            let result;
            if (editingCajero) {
                result = await updateCajero(user, editingCajero.id, formData);
            } else {
                result = await createCajero(user, formData);
            }

            if (result.error || !result.data) {
                throw new Error(result.error || 'Ocurrió un error desconocido.');
            }
            
            toast({
                title: `Cajero ${editingCajero ? 'actualizado' : 'creado'}`,
                description: `El cajero "${result.data.nombre_completo}" se ha guardado correctamente.`,
            });
            
            setIsDialogOpen(false);
            await fetchCajeros();

        } catch (e) {
            toast({
                variant: 'destructive',
                title: 'Error al guardar el cajero',
                description: (e as Error).message,
            });
        }
    };

    if (authLoading || (loading && !cajeros.length)) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="space-y-4 p-8 w-full max-w-7xl">
                    <Skeleton className="h-10 w-1/3" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        );
    }
    
    if (!user) return null; // Should be redirected by the hook

    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
                <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
                    <h1 className="text-2xl font-bold text-primary flex items-center gap-2"><Users /> Gestión de Cajeros</h1>
                    <div className="flex items-center gap-2">
                         <Button onClick={handleOpenNewDialog}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Crear Cajero
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href="/">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Volver a Ventas
                            </Link>
                        </Button>
                    </div>
                </div>
            </header>
            <main className="container mx-auto p-4 md:p-6 space-y-6">
                {error && (
                    <Card className="mb-6 border-destructive bg-destructive/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-destructive">
                                <AlertTriangle/> Error de Carga
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-destructive/90">{error}</p>
                        </CardContent>
                    </Card>
                )}
                <Card>
                    <CardHeader>
                        <CardTitle>Lista de Cajeros y Permisos</CardTitle>
                        <CardDescription>
                            Aquí puedes ver, crear y editar los usuarios y sus permisos en el sistema.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nombre Completo</TableHead>
                                        <TableHead>Username</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead>Dashboard</TableHead>
                                        <TableHead>Artículos</TableHead>
                                        <TableHead>Devoluciones</TableHead>
                                        <TableHead>Verificar Davi</TableHead>
                                        <TableHead>Análisis IA</TableHead>
                                        <TableHead>Logs</TableHead>
                                        <TableHead>Cajeros</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        Array.from({ length: 3 }).map((_, i) => (
                                            <TableRow key={i}>
                                                <TableCell colSpan={11}><Skeleton className="h-8 w-full" /></TableCell>
                                            </TableRow>
                                        ))
                                    ) : cajeros.length > 0 ? (
                                        cajeros.map(cajero => (
                                            <TableRow key={cajero.id}>
                                                <TableCell className="font-medium">{cajero.nombre_completo}</TableCell>
                                                <TableCell>{cajero.username}</TableCell>
                                                <TableCell>
                                                    <Badge variant={cajero.activo ? 'default' : 'secondary'}>
                                                        {cajero.activo ? 'Activo' : 'Inactivo'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell><PermissionIndicator allowed={!!cajero.can_access_dashboard} /></TableCell>
                                                <TableCell><PermissionIndicator allowed={!!cajero.can_access_articles} /></TableCell>
                                                <TableCell><PermissionIndicator allowed={!!cajero.can_view_returns} /></TableCell>
                                                <TableCell><PermissionIndicator allowed={!!cajero.can_verify_daviplata} /></TableCell>
                                                <TableCell><PermissionIndicator allowed={!!cajero.can_access_ai_analysis} /></TableCell>
                                                <TableCell><PermissionIndicator allowed={!!cajero.can_view_logs} /></TableCell>
                                                <TableCell><PermissionIndicator allowed={!!cajero.can_access_cajeros} /></TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(cajero)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={11} className="text-center text-muted-foreground py-10">
                                                No se encontraron cajeros.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </main>
            <CajeroFormDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onSubmit={handleFormSubmit}
                cajero={editingCajero}
            />
        </div>
    )
}
