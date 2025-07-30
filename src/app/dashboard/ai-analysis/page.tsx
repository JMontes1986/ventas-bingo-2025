
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import useAuth from '@/hooks/useAuth';
import { getDashboardData, getSalesByArticle, getAllReturns, getAllSales, getAiAnalysis } from '@/app/actions';
import type { DashboardAnalysisInput } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, AlertTriangle, Sparkles, Wand2, Users } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';


export default function AiAnalysisPage() {
    const { user, loading: authLoading } = useAuth({ requiredPermission: 'can_access_ai_analysis' });
    const router = useRouter();
    const { toast } = useToast();
    
    const [analysisResult, setAnalysisResult] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [hasRun, setHasRun] = useState(false);

    const runAnalysis = useCallback(async (question?: string) => {
        if (!user) return;
        try {
            setLoading(true);
            setError(null);
            setAnalysisResult('');
            setHasRun(true);
            
            // 1. Fetch all required data in parallel
            const [
                dashboardResult,
                salesByArticleResult,
                returnsResult,
                allSalesResult
            ] = await Promise.all([
                getDashboardData(),
                getSalesByArticle(),
                getAllReturns(),
                getAllSales()
            ]);

            // 2. Check for errors in data fetching
            const errors = [
                dashboardResult.error,
                salesByArticleResult.error,
                returnsResult.error,
                allSalesResult.error
            ].filter(Boolean);

            if (errors.length > 0 || !dashboardResult.data) {
                throw new Error(`No se pudieron cargar los datos necesarios para el análisis: ${errors.join(', ')}`);
            }

            // 3. Prepare the input for the AI
            const analysisInput: DashboardAnalysisInput = {
                generalData: dashboardResult.data,
                articleSales: salesByArticleResult.data || [],
                allSales: allSalesResult.data || [],
                returns: returnsResult.data || [],
                question: question,
            };
            
            // 4. Call the AI analysis action
            const result = await getAiAnalysis(analysisInput);

            if(result.error){
                 throw new Error(result.error);
            }
            
            setAnalysisResult(result.analysis || '');

        } catch (err) {
            console.error('Error running AI analysis:', err);
            const errorMessage = (err as Error).message;
            setError(errorMessage);
            toast({
                variant: 'destructive',
                title: 'Error de Análisis',
                description: `No se pudo completar el análisis de la IA.\n${errorMessage}`,
                duration: 10000,
            });
        } finally {
            setLoading(false);
        }
    }, [toast, user]);

    const handleAskQuestion = () => {
        if (query.trim()) {
            runAnalysis(query.trim());
        }
    };
    
    const handleGenerateReport = () => {
        setQuery('');
        runAnalysis();
    };


    if (authLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="space-y-4 p-8 w-full max-w-4xl">
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
                        <Sparkles /> Asistente de Análisis con IA
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
                <Card>
                    <CardHeader>
                        <CardTitle>Interactúa con los Datos del Evento</CardTitle>
                        <CardDescription>
                           Haz una pregunta específica sobre las ventas o genera un informe estratégico completo.
                        </CardDescription>
                        <div className="pt-4 space-y-2">
                           <Textarea 
                             placeholder="Ej: ¿Cuál es el artículo menos vendido? ¿Cuánto se ha vendido en Daviplata hoy? ¿Qué cajero ha vendido más?"
                             value={query}
                             onChange={(e) => setQuery(e.target.value)}
                             className="text-base"
                           />
                           <div className="flex flex-col sm:flex-row gap-2">
                             <Button onClick={handleAskQuestion} disabled={loading || !query.trim()} className="w-full">
                                {loading && query ? <Wand2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                                Preguntar a la IA
                             </Button>
                             <Button onClick={handleGenerateReport} disabled={loading} variant="secondary" className="w-full">
                                {loading && !query ? <Wand2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                Generar Informe General
                             </Button>
                           </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                           <div className="space-y-6">
                             <div className="space-y-2">
                               <Skeleton className="h-6 w-1/4" />
                               <Skeleton className="h-4 w-full" />
                               <Skeleton className="h-4 w-3/4" />
                             </div>
                             <div className="space-y-2">
                               <Skeleton className="h-6 w-1/3" />
                               <Skeleton className="h-4 w-full" />
                               <Skeleton className="h-4 w-2/3" />
                             </div>
                           </div>
                        ) : error ? (
                            <div className="border-l-4 border-destructive pl-4 py-2">
                                <h3 className="font-semibold text-destructive flex items-center gap-2"><AlertTriangle/>Análisis no disponible</h3>
                                <p className="text-muted-foreground">{error}</p>
                            </div>
                        ) : hasRun ? (
                             <div className="prose prose-sm sm:prose-base max-w-none text-foreground prose-headings:text-primary prose-strong:text-foreground">
                                <ReactMarkdown>{analysisResult}</ReactMarkdown>
                            </div>
                        ) : (
                           <div className="text-center py-10 text-muted-foreground">
                               <Sparkles className="mx-auto h-12 w-12 opacity-50 mb-4" />
                               <p className="font-semibold">El asistente está listo.</p>
                               <p>Escribe una pregunta o genera el informe para comenzar.</p>
                           </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}
