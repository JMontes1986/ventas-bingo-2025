
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { runStressTest } from '@/app/actions';
import { ArrowLeft, Zap, CheckCircle, AlertTriangle, Loader2, BarChart, Clock, Users } from 'lucide-react';
import Link from 'next/link';

interface TestResult {
    successCount: number;
    errorCount: number;
    duration: number;
    errors: string[];
}

export default function StressTestPage() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<TestResult | null>(null);
    const [progress, setProgress] = useState(0);

    const [cajeroTransactionCount, setCajeroTransactionCount] = useState(100);
    const [cajeroCount, setCajeroCount] = useState(5);
    const [daviplataTransactionCount, setDaviplataTransactionCount] = useState(20);

    const handleRunTest = async () => {
        setIsLoading(true);
        setResults(null);
        setProgress(0);

        const totalTransactions = cajeroTransactionCount + daviplataTransactionCount;

        try {
            // This is a simplified progress simulation. 
            // A more accurate one would require streaming results from the server.
            const progressInterval = setInterval(() => {
                setProgress(prev => Math.min(prev + 10, 90));
            }, (totalTransactions * 15) / 10); // Rough estimate

            const result = await runStressTest(cajeroTransactionCount, cajeroCount, daviplataTransactionCount);
            
            clearInterval(progressInterval);
            setProgress(100);
            setResults(result);

            toast({
                title: 'Prueba de Estrés Completada',
                description: `${result.successCount} transacciones exitosas, ${result.errorCount} errores.`,
            });
        } catch (e) {
            toast({
                variant: 'destructive',
                title: 'Error Crítico',
                description: 'No se pudo ejecutar la prueba de estrés. ' + (e as Error).message,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
             <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
                <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
                    <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
                        <Zap /> Prueba de Estrés del Sistema
                    </h1>
                    <Button variant="outline" asChild>
                        <Link href="/">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Volver a Ventas
                        </Link>
                    </Button>
                </div>
            </header>
            <main className="container mx-auto p-4 md:p-6 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Simulador de Carga</CardTitle>
                        <CardDescription>
                            Configura y ejecuta una prueba para simular una alta concurrencia de transacciones
                            y medir el rendimiento de la aplicación y la base de datos.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="cajeroTransactionCount">Nº de Transacciones en Caja</Label>
                                <Input 
                                    id="cajeroTransactionCount" 
                                    type="number"
                                    value={cajeroTransactionCount}
                                    onChange={(e) => setCajeroTransactionCount(Number(e.target.value))}
                                    disabled={isLoading}
                                />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="cajeroCount">Nº de Cajeros Concurrentes</Label>
                                <Input 
                                    id="cajeroCount" 
                                    type="number"
                                    value={cajeroCount}
                                    onChange={(e) => setCajeroCount(Number(e.target.value))}
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="daviplataTransactionCount">Nº de Transacciones Daviplata</Label>
                                <Input 
                                    id="daviplataTransactionCount" 
                                    type="number"
                                    value={daviplataTransactionCount}
                                    onChange={(e) => setDaviplataTransactionCount(Number(e.target.value))}
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                        <Button 
                            onClick={handleRunTest} 
                            disabled={isLoading} 
                            className="w-full"
                            size="lg"
                        >
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                            {isLoading ? `Ejecutando... (${progress.toFixed(0)}%)` : 'Iniciar Prueba de Estrés'}
                        </Button>
                        {isLoading && <Progress value={progress} className="w-full mt-2" />}
                    </CardContent>
                </Card>

                {results && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><BarChart /> Resultados de la Prueba</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                <div className="p-4 bg-muted rounded-lg">
                                    <h3 className="font-bold text-2xl text-green-600">{results.successCount}</h3>
                                    <p className="text-sm text-muted-foreground flex items-center justify-center gap-1"><CheckCircle className="h-4 w-4"/> Exitosas</p>
                                </div>
                                <div className="p-4 bg-muted rounded-lg">
                                    <h3 className="font-bold text-2xl text-red-600">{results.errorCount}</h3>
                                    <p className="text-sm text-muted-foreground flex items-center justify-center gap-1"><AlertTriangle className="h-4 w-4"/> Fallidas</p>
                                </div>
                                <div className="p-4 bg-muted rounded-lg">
                                    <h3 className="font-bold text-2xl">{(results.duration / 1000).toFixed(2)}s</h3>
                                    <p className="text-sm text-muted-foreground flex items-center justify-center gap-1"><Clock className="h-4 w-4"/> Duración</p>
                                </div>
                                <div className="p-4 bg-muted rounded-lg">
                                    <h3 className="font-bold text-2xl">{cajeroCount}</h3>
                                    <p className="text-sm text-muted-foreground flex items-center justify-center gap-1"><Users className="h-4 w-4"/> Cajeros</p>
                                </div>
                           </div>

                            {results.errorCount > 0 && (
                                <div>
                                    <h4 className="font-semibold mb-2">Registro de Errores:</h4>
                                    <div className="max-h-60 overflow-y-auto bg-destructive/10 p-3 rounded-md">
                                        <pre className="text-xs text-destructive whitespace-pre-wrap">
                                            {results.errors.slice(0, 20).join('\n')}
                                            {results.errors.length > 20 && `\n... y ${results.errors.length - 20} más.`}
                                        </pre>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </main>
        </div>
    );
}

    
