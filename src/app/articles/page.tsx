
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import useAuth from '@/hooks/useAuth';
import { getArticles, createArticle, updateArticle, toggleArticleAvailability, toggleArticleClientVisibility } from '@/app/actions';
import type { Article, ArticleFormData, Cajero } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Edit, PlusCircle, AlertTriangle, Users, LayoutDashboard, ShieldCheck, Power, PowerOff, CheckCircle, XCircle } from 'lucide-react';
import ArticleFormDialog from '@/components/ArticleFormDialog';
import { Switch } from '@/components/ui/switch';

const formatCurrency = (value: number) => {
    if (typeof value !== 'number') return '$0';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
};

export default function ArticleManagementPage() {
    const { user, loading: authLoading } = useAuth({ requiredPermission: 'can_access_articles' });
    const { toast } = useToast();
    
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingArticle, setEditingArticle] = useState<Article | null>(null);

    const fetchArticles = useCallback(async () => {
        if (!user) return;
        try {
            setLoading(true);
            setError(null);
            const articlesResult = await getArticles();
            
            if (articlesResult.error) throw new Error(articlesResult.error);
            
            setArticles(articlesResult.data || []);

        } catch (err) {
            console.error('Error fetching data:', err);
            setError((err as Error).message);
            toast({
                variant: 'destructive',
                title: 'Error al cargar los datos',
                description: 'No se pudieron cargar los artículos. Por favor, intente de nuevo.'
            });
        } finally {
            setLoading(false);
        }
    }, [user, toast]);
    
    useEffect(() => {
        if (user) {
            fetchArticles();
        }
    }, [user, fetchArticles]);

    const handleOpenNewDialog = () => {
        setEditingArticle(null);
        setIsDialogOpen(true);
    };

    const handleOpenEditDialog = (article: Article) => {
        setEditingArticle(article);
        setIsDialogOpen(true);
    };

    const handleFormSubmit = useCallback(async (formData: ArticleFormData) => {
        if (!user) {
            toast({ variant: 'destructive', title: 'Error de autenticación' });
            return;
        }

        try {
            let result;
            if (editingArticle) {
                result = await updateArticle(user as Cajero, editingArticle.id, formData);
            } else {
                result = await createArticle(user as Cajero, formData);
            }

            if (result.error || !result.data) {
                throw new Error(result.error || 'Ocurrió un error desconocido.');
            }
            
            toast({
                title: `Artículo ${editingArticle ? 'actualizado' : 'creado'}`,
                description: `El artículo "${result.data.nombre}" se ha guardado correctamente.`,
            });
            
            setIsDialogOpen(false);
            await fetchArticles(); // Refresh the article list

        } catch (e) {
            toast({
                variant: 'destructive',
                title: 'Error al guardar el artículo',
                description: (e as Error).message,
            });
        }
    }, [editingArticle, user, toast, fetchArticles]);
    
    const handleToggleAvailability = async (articleId: number, currentStatus: boolean) => {
        if (!user) return;
        
        setArticles(prev => prev.map(a => a.id === articleId ? { ...a, activo: !currentStatus } : a));

        const result = await toggleArticleAvailability(user as Cajero, articleId, !currentStatus);

        if (result.success) {
            toast({
                title: "Estado actualizado",
                description: `El artículo ahora está ${!currentStatus ? 'activo' : 'inactivo'}.`
            });
        } else {
            setArticles(prev => prev.map(a => a.id === articleId ? { ...a, activo: currentStatus } : a));
            toast({ variant: "destructive", title: "Error", description: result.error });
        }
    };

    const handleToggleClientVisibility = async (articleId: number, currentStatus: boolean) => {
        if (!user) return;

        setArticles(prev => prev.map(a => a.id === articleId ? { ...a, visible_cliente: !currentStatus } : a));
        
        const result = await toggleArticleClientVisibility(user as Cajero, articleId, !currentStatus);

        if (result.success) {
            toast({
                title: "Visibilidad actualizada",
                description: `El artículo ahora es ${!currentStatus ? 'visible' : 'no visible'} para el cliente.`
            });
        } else {
            setArticles(prev => prev.map(a => a.id === articleId ? { ...a, visible_cliente: currentStatus } : a));
            toast({ variant: "destructive", title: "Error", description: result.error });
        }
    };


    if (authLoading || (loading && !articles.length)) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="space-y-4 p-8 w-full max-w-4xl">
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
                    <h1 className="text-2xl font-bold text-primary">Gestión de Artículos</h1>
                    <div className="flex items-center gap-2">
                        {user.can_access_dashboard && (
                            <Button variant="outline" size="sm" asChild>
                                <Link href="/dashboard">
                                    <LayoutDashboard className="mr-1 h-4 w-4" />
                                    Dashboard
                                </Link>
                            </Button>
                        )}
                        {user.can_view_logs && (
                             <Button variant="outline" size="sm" asChild>
                                <Link href="/dashboard/logs">
                                    <ShieldCheck className="mr-1 h-4 w-4" />
                                    Logs
                                </Link>
                            </Button>
                        )}
                        {user.can_access_cajeros && (
                            <Button variant="outline" size="sm" asChild>
                                <Link href="/cajeros">
                                    <Users className="mr-1 h-4 w-4" />
                                    Cajeros
                                </Link>
                            </Button>
                        )}
                         <Button onClick={handleOpenNewDialog}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Crear
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href="/">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Volver
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
                            <p className="text-destructive/90">No se pudieron cargar los datos de los artículos. Revisa tu conexión y la configuración de Supabase.</p>
                            <pre className="mt-2 p-2 bg-black/10 rounded-md text-destructive whitespace-pre-wrap text-sm">
                                <code>{error}</code>
                            </pre>
                        </CardContent>
                    </Card>
                )}
                <Card>
                    <CardHeader>
                        <CardTitle>Lista de Artículos</CardTitle>
                        <CardDescription>
                            Aquí puedes ver, crear, editar y cambiar el estado de todos los artículos del sistema.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre del Artículo</TableHead>
                                    <TableHead>Precio</TableHead>
                                    <TableHead>Stock Inicial</TableHead>
                                    <TableHead className="text-center">Estado</TableHead>
                                    <TableHead className="text-center">Vista al Cliente</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-24 mx-auto" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-24 mx-auto" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : articles.length > 0 ? (
                                    articles.map(article => (
                                        <TableRow key={article.id}>
                                            <TableCell className="font-medium">
                                                {article.nombre}
                                            </TableCell>
                                            <TableCell>{formatCurrency(article.precio)}</TableCell>
                                            <TableCell>{article.stock_inicial}</TableCell>
                                            <TableCell className="text-center">
                                                <Switch
                                                    checked={article.activo}
                                                    onCheckedChange={() => handleToggleAvailability(article.id as number, article.activo)}
                                                    aria-label={`Toggle ${article.nombre} availability`}
                                                />
                                            </TableCell>
                                            <TableCell className="text-center">
                                               <Switch
                                                    checked={!!article.visible_cliente}
                                                    onCheckedChange={() => handleToggleClientVisibility(article.id as number, !!article.visible_cliente)}
                                                    aria-label={`Toggle ${article.nombre} client visibility`}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(article)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                                            No se encontraron artículos. Use el botón "Crear Artículo" para añadir uno.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </main>
            <ArticleFormDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onSubmit={handleFormSubmit}
                article={editingArticle}
            />
        </div>
    )
}

    