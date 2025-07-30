
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { runDiagnostics } from '@/app/actions';
import { Loader2, CheckCircle, AlertTriangle, Terminal, Server, Database, BrainCircuit } from 'lucide-react';
import { cn } from '@/lib/utils';

type DiagnosticResult = Record<string, {success: boolean; message: string; data?: any}>;

export default function DiagnosticPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<DiagnosticResult | null>(null);

    const handleRunTests = async () => {
        setIsLoading(true);
        setResults(null);
        try {
            const res = await runDiagnostics();
            setResults(res);
        } catch (e: any) {
            setResults({
                critical_error: {
                    success: false,
                    message: `La acción de diagnóstico falló catastróficamente: ${e.message}. Esto puede indicar un problema de compilación severo.`
                }
            });
        }
        setIsLoading(false);
    };

    const ResultRow = ({ title, icon: Icon, result }: { title: string; icon: React.ElementType; result?: {success: boolean; message: string} }) => (
        <div className="flex items-start p-3 border-b last:border-b-0">
            <div className="flex-shrink-0">
                <Icon className={cn("h-6 w-6 mr-4", result ? (result.success ? 'text-green-500' : 'text-destructive') : 'text-muted-foreground')} />
            </div>
            <div className="flex-grow">
                <p className="font-semibold">{title}</p>
                {result ? (
                     <p className={cn("text-sm", result.success ? 'text-green-700' : 'text-destructive')}>{result.message}</p>
                ) : (
                    <p className="text-sm text-muted-foreground">Prueba no ejecutada.</p>
                )}
            </div>
            {result && (
                <div className="flex-shrink-0">
                    {result.success ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                    )}
                </div>
            )}
        </div>
    );
    

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50 space-y-6">
             <Card className="w-full max-w-2xl shadow-lg">
                <CardHeader>
                    <div className="flex items-center gap-3">
                         <Terminal className="h-8 w-8 text-primary" />
                        <div>
                             <CardTitle className="text-2xl">Página de Diagnóstico del Sistema</CardTitle>
                             <CardDescription>
                                Esta herramienta prueba las conexiones críticas de la aplicación.
                             </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button onClick={handleRunTests} disabled={isLoading} className="w-full">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isLoading ? 'Ejecutando Pruebas...' : 'Ejecutar Diagnóstico'}
                    </Button>
                    
                    {results && (
                        <div className="border rounded-lg mt-4">
                            <ResultRow title="Variables de Entorno" icon={Server} result={results.envVars} />
                            <ResultRow title="Conexión a Supabase" icon={Database} result={results.supabaseConnection} />
                            <ResultRow title="Consulta a Base de Datos" icon={Database} result={results.supabaseQuery} />
                            <ResultRow title="Conexión a Genkit (IA)" icon={BrainCircuit} result={results.genkitTest} />
                            {results.critical_error && <ResultRow title="Error Crítico del Proceso" icon={AlertTriangle} result={results.critical_error} />}
                        </div>
                    )}
                </CardContent>
            </Card>
        </main>
    );
}
