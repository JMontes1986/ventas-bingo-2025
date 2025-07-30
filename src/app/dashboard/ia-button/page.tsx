
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useAuth from '@/hooks/useAuth';
import { getDaviplataConversations, sendAdminChatMessage } from '@/app/actions';
import type { DaviplataConversation, Cajero } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, AlertTriangle, MessageSquare, RefreshCw, Send, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return format(date, "d MMM, yyyy 'a las' h:mm:ss a", { locale: es });
    } catch (e) {
        return dateString;
    }
};

const AdminChatIntervention = ({ sessionId, onMessageSent }: { sessionId: string; onMessageSent: () => void }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);

    const handleSend = async () => {
        if (!message.trim() || !user) return;
        setIsSending(true);
        try {
            const result = await sendAdminChatMessage(user as Cajero, sessionId, message.trim());
            if (result.error) throw new Error(result.error);
            setMessage('');
            toast({ title: "Mensaje enviado", description: "Tu mensaje ha sido añadido a la conversación." });
            onMessageSent();
        } catch (e) {
            toast({ variant: "destructive", title: "Error", description: (e as Error).message });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="flex items-center gap-2 mt-4 p-4 border-t bg-background">
            <Input 
                placeholder="Escribe tu respuesta como admin..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                disabled={isSending}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
            />
            <Button onClick={handleSend} disabled={isSending || !message.trim()}>
                <Send className="h-4 w-4" />
            </Button>
        </div>
    );
};


export default function DaviplataChatLogPage() {
    const { user, loading: authLoading } = useAuth({ requiredPermission: 'can_access_ai_analysis' });
    const router = useRouter();
    const { toast } = useToast();
    
    const [conversations, setConversations] = useState<Record<string, DaviplataConversation[]>>({});
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchConversations = useCallback(async (isRefresh = false) => {
        if (!user) return;
        if(isRefresh) setIsRefreshing(true);
        else setLoading(true);

        try {
            setError(null);
            const result = await getDaviplataConversations(user as Cajero);
            if (result.error) throw new Error(result.error);
            
            // Sort sessions by the timestamp of the last message in each session
            const sortedSessionIds = Object.keys(result.data || {}).sort((a, b) => {
                const lastMessageA = result.data![a][result.data![a].length - 1];
                const lastMessageB = result.data![b][result.data![b].length - 1];
                return new Date(lastMessageB.timestamp!).getTime() - new Date(lastMessageA.timestamp!).getTime();
            });

            const sortedConversations: Record<string, DaviplataConversation[]> = {};
            for (const sessionId of sortedSessionIds) {
                sortedConversations[sessionId] = result.data![sessionId];
            }
            
            setConversations(sortedConversations);
        } catch (err) {
            console.error('Error fetching conversations:', err);
            setError((err as Error).message);
            setConversations({});
            toast({
                variant: 'destructive',
                title: 'Error al cargar los registros',
                description: 'No se pudo cargar el historial de chat. Por favor, intente de nuevo.'
            });
        } finally {
            if(isRefresh) setIsRefreshing(false);
            else setLoading(false);
        }
    }, [toast, user]);
    
    useEffect(() => {
        if (user) {
            fetchConversations();
        }
    }, [user, fetchConversations]);

    const conversationKeys = Object.keys(conversations);

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
                        <MessageSquare /> Conversaciones del Botón IA
                    </h1>
                     <div className="flex items-center gap-2">
                         <Button variant="ghost" size="icon" onClick={() => fetchConversations(true)} disabled={isRefreshing}>
                            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                         </Button>
                        <Button variant="outline" onClick={() => router.push('/')}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Volver a Ventas
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
                            <p className="text-destructive/90">{error}</p>
                        </CardContent>
                    </Card>
                )}
                <Card>
                    <CardHeader>
                        <CardTitle>Historial de Chats</CardTitle>
                        <CardDescription>
                            Aquí se muestran las conversaciones que los padres han tenido con el asistente IA. Puedes intervenir en cualquier momento.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="space-y-2">
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                            </div>
                        ) : conversationKeys.length > 0 ? (
                           <Accordion type="single" collapsible className="w-full">
                                {conversationKeys.map((sessionId, index) => {
                                    const session = conversations[sessionId];
                                    const firstMessage = session[0];
                                    const lastMessage = session[session.length - 1];

                                    return (
                                        <AccordionItem value={sessionId} key={sessionId}>
                                            <AccordionTrigger className="hover:no-underline">
                                                <div className="flex justify-between items-center w-full pr-4">
                                                    <div className="text-left">
                                                        <p className="font-semibold text-sm">
                                                           {`Conversación #${conversationKeys.length - index}`}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground truncate max-w-xs sm:max-w-md">
                                                            {firstMessage.message}
                                                        </p>
                                                    </div>
                                                    <div className="text-right text-xs text-muted-foreground hidden sm:block">
                                                         <p>{session.length} mensajes</p>
                                                         <p>Último: {formatDate(lastMessage.timestamp!)}</p>
                                                    </div>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                                <div className="bg-muted/50 rounded-lg flex flex-col">
                                                    <div className="p-4 space-y-4 flex-grow">
                                                        {session.map((msg) => (
                                                            <div key={msg.id} className={cn("flex items-end gap-2", msg.sender === 'user' ? 'justify-end' : 'justify-start')}>
                                                            {msg.sender === 'ai' && (
                                                                    <Image 
                                                                        src="https://btwhvavwqkzifiuhgcao.supabase.co/storage/v1/object/sign/ventas/Recurso%209.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8wYzNjNTVjNy1iNTM4LTQ5MDUtYTIwYy04ZjllZmEwZDk2NjEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ2ZW50YXMvUmVjdXJzbyA5LnBuZyIsImlhdCI6MTc1MzQ3NDE0MiwiZXhwIjoxNzg1MDEwMTQyfQ.L7HgCpSeNEnrXjjKEnr5IfAvcHIFXidkj0-cJszIMgM"
                                                                        alt="IA Icon"
                                                                        width={32}
                                                                        height={32}
                                                                        className="rounded-full"
                                                                    />
                                                                )}
                                                            {msg.sender === 'admin' && <UserCheck className="h-8 w-8 text-blue-500" />}
                                                                <div className={cn(
                                                                    "max-w-xs md:max-w-md p-3 rounded-2xl",
                                                                    msg.sender === 'user' && 'bg-primary text-primary-foreground rounded-br-none',
                                                                    msg.sender === 'ai' && 'bg-background rounded-bl-none',
                                                                    msg.sender === 'admin' && 'bg-blue-100 text-blue-900 rounded-br-none'
                                                                )}>
                                                                    <p className="text-sm">{msg.message}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <AdminChatIntervention sessionId={sessionId} onMessageSent={() => fetchConversations(true)} />
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    )
                                })}
                           </Accordion>
                        ) : (
                            <div className="text-center text-muted-foreground py-10">
                                <p>No se han registrado conversaciones todavía.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}
