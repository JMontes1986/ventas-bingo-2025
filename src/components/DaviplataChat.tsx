
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, X, FileText, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import type { DaviplataConversation } from '@/types';
import { askDaviplataAssistant } from '@/app/actions';
import { Label } from '@/components/ui/label';

export default function DaviplataChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId] = useState(() => uuidv4());
  const [messages, setMessages] = useState<DaviplataConversation[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [clientInfo, setClientInfo] = useState<{document: string, phone: string} | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const inactivityTimer = useRef<NodeJS.Timeout | null>(null);
  const inactivityWarningTimer = useRef<NodeJS.Timeout | null>(null);
  const [hasSentWarning, setHasSentWarning] = useState(false);

  const handleToggle = () => setIsOpen(prev => !prev);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
        setTimeout(() => {
             const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
            if(viewport) {
                viewport.scrollTop = viewport.scrollHeight;
            }
        }, 100);
    }
  };

  const stopInactivityTimers = () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      if (inactivityWarningTimer.current) clearTimeout(inactivityWarningTimer.current);
  }

  const resetInactivityTimers = useCallback(() => {
    stopInactivityTimers();
    setHasSentWarning(false);
    
    if (isLoading || !clientInfo) return;

    inactivityWarningTimer.current = setTimeout(() => {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage?.sender === 'ai' && !hasSentWarning) {
            const warningMessage: DaviplataConversation = {
                id: Math.random(),
                session_id: sessionId,
                sender: 'ai',
                message: "¿Sigues ahí? Si necesitas algo más, házmelo saber.",
            };
            setMessages(prev => [...prev, warningMessage]);
            setHasSentWarning(true);
            
            inactivityTimer.current = setTimeout(() => {
                 const farewellMessage: DaviplataConversation = {
                    id: Math.random(),
                    session_id: sessionId,
                    sender: 'ai',
                    message: "Parece que no hay nadie. Si cambias de opinión, estoy aquí para ayudar. ¡Que tengas un gran día!",
                };
                setMessages(prev => [...prev, farewellMessage]);
            }, 60000); // 1 minute for final timeout
        }
    }, 60000); // 1 minute for warning
  }, [messages, isLoading, sessionId, hasSentWarning, clientInfo]);

  useEffect(() => {
    scrollToBottom();
    if(isOpen) {
      resetInactivityTimers();
    } else {
      stopInactivityTimers();
    }
  }, [messages, resetInactivityTimers, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !clientInfo) return;

    const userMessage: DaviplataConversation = {
      id: Math.random(),
      session_id: sessionId,
      sender: 'user',
      message: input.trim(),
    };
    
    const currentHistory = [...messages];
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    stopInactivityTimers();

    try {
      const result = await askDaviplataAssistant(userMessage.message, currentHistory, sessionId, clientInfo);

      if (result.error) {
        throw new Error(result.error);
      }
      
      const aiMessage: DaviplataConversation = {
        id: Math.random(),
        session_id: sessionId,
        sender: 'ai',
        message: result.response,
        video_data_uri: result.videoDataUri
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: DaviplataConversation = {
        id: Math.random(),
        session_id: sessionId,
        sender: 'ai',
        message: "Lo siento, tuve un problema para conectarme. Por favor, intenta de nuevo.",
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleStartChat = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const document = formData.get('document') as string;
      const phone = formData.get('phone') as string;
      if (document.trim() && phone.trim()) {
          setClientInfo({ document, phone });
      }
  };


  return (
    <>
      <div className={cn(
        "fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-50 transition-all duration-300",
        isOpen && "pointer-events-none opacity-0"
      )}>
        <Button onClick={handleToggle} className="rounded-full w-16 h-16 shadow-lg" aria-label="Abrir chat">
            <Image
                src="https://btwhvavwqkzifiuhgcao.supabase.co/storage/v1/object/sign/ventas/Recurso%209.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8wYzNjNTVjNy1iNTM4LTQ5MDUtYTIwYy04ZjllZmEwZDk2NjEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ2ZW50YXMvUmVjdXJzbyA5LnBuZyIsImlhdCI6MTc1MzQ3NDE0MiwiZXhwIjoxNzg1MDEwMTQyfQ.L7HgCpSeNEnrXjjKEnr5IfAvcHIFXidkj0-cJszIMgM"
                alt="Chat Icon"
                width={40}
                height={40}
            />
        </Button>
      </div>

      <div className={cn(
        "fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-50 w-[calc(100%-2rem)] max-w-xs h-[60vh] max-h-[400px] bg-card border rounded-lg shadow-xl flex flex-col transition-all duration-300 origin-bottom-right",
        isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0 pointer-events-none"
      )}>
        <header className="flex items-center justify-between p-3 border-b bg-card/70 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Image
                src="https://btwhvavwqkzifiuhgcao.supabase.co/storage/v1/object/sign/ventas/Recurso%209.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8wYzNjNTVjNy1iNTM4LTQ5MDUtYTIwYy04ZjllZmEwZDk2NjEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ2ZW50YXMvUmVjdXJzbyA5LnBuZyIsImlhdCI6MTc1MzQ3NDE0MiwiZXhwIjoxNzg1MDEwMTQyfQ.L7HgCpSeNEnrXjjKEnr5IfAvcHIFXidkj0-cJszIMgM"
                alt="Chat Icon"
                width={24}
                height={24}
            />
            <h3 className="font-semibold text-sm">Asistente Molly Colgemelli</h3>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleToggle}>
            <X className="h-4 w-4" />
          </Button>
        </header>
        
        {!clientInfo ? (
            <div className="p-6 flex-grow flex flex-col justify-center">
                <form onSubmit={handleStartChat} className="space-y-4">
                    <h4 className="font-semibold text-center">Identifícate para comenzar</h4>
                    <div className="space-y-1">
                        <Label htmlFor="document">Documento</Label>
                        <div className="relative">
                            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input name="document" id="document" placeholder="Tu número de documento" required className="pl-9" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="phone">Nº Celular</Label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input name="phone" id="phone" placeholder="Tu número de celular" required className="pl-9" />
                        </div>
                    </div>
                    <Button type="submit" className="w-full">Iniciar Chat</Button>
                </form>
            </div>
        ) : (
            <>
                <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
                  <div className="space-y-4">
                     <div className={cn("flex items-end gap-2 justify-start")}>
                         <Image 
                            src="https://btwhvavwqkzifiuhgcao.supabase.co/storage/v1/object/sign/ventas/Recurso%209.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8wYzNjNTVjNy1iNTM4LTQ5MDUtYTIwYy04ZjllZmEwZDk2NjEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ2ZW50YXMvUmVjdXJzbyA5LnBuZyIsImlhdCI6MTc1MzQ3NDE0MiwiZXhwIjoxNzg1MDEwMTQyfQ.L7HgCpSeNEnrXjjKEnr5IfAvcHIFXidkj0-cJszIMgM"
                            alt="IA Icon"
                            width={24}
                            height={24}
                            className="rounded-full"
                        />
                        <div className="max-w-xs p-3 rounded-2xl bg-muted rounded-bl-none">
                            <p className="text-sm">¡Hola! Soy Molly, tu asistente. ¿Cómo puedo ayudarte con tu compra para el Bingo 2025?</p>
                        </div>
                    </div>
                    {messages.map((msg) => (
                      <div key={msg.id} className={cn("flex items-end gap-2", msg.sender === 'user' ? 'justify-end' : 'justify-start')}>
                         {msg.sender === 'ai' && (
                             <Image 
                                src="https://btwhvavwqkzifiuhgcao.supabase.co/storage/v1/object/sign/ventas/Recurso%209.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8wYzNjNTVjNy1iNTM4LTQ5MDUtYTIwYy04ZjllZmEwZDk2NjEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ2ZW50YXMvUmVjdXJzbyA5LnBuZyIsImlhdCI6MTc1MzQ3NDE0MiwiZXhwIjoxNzg1MDEwMTQyfQ.L7HgCpSeNEnrXjjKEnr5IfAvcHIFXidkj0-cJszIMgM"
                                alt="IA Icon"
                                width={24}
                                height={24}
                                className="rounded-full self-start"
                            />
                        )}
                        <div className={cn(
                          "max-w-xs p-3 rounded-2xl",
                          msg.sender === 'user' ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted rounded-bl-none'
                        )}>
                            <p className="text-sm">{msg.message}</p>
                            {msg.video_data_uri && (
                                <div className="mt-2">
                                    <video
                                        controls
                                        src={msg.video_data_uri}
                                        className="w-full rounded-lg"
                                    />
                                </div>
                            )}
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                       <div className={cn("flex items-end gap-2 justify-start")}>
                         <Image 
                            src="https://btwhvavwqkzifiuhgcao.supabase.co/storage/v1/object/sign/ventas/Recurso%209.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8wYzNjNTVjNy1iNTM4LTQ5MDUtYTIwYy04ZjllZmEwZDk2NjEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ2ZW50YXMvUmVjdXJzbyA5LnBuZyIsImlhdCI6MTc1MzQ3NDE0MiwiZXhwIjoxNzg1MDEwMTQyfQ.L7HgCpSeNEnrXjjKEnr5IfAvcHIFXidkj0-cJszIMgM"
                            alt="IA Icon"
                            width={24}
                            height={24}
                            className="rounded-full"
                        />
                        <div className="max-w-xs p-3 rounded-2xl bg-muted rounded-bl-none flex items-center gap-2">
                           <Loader2 className="h-4 w-4 animate-spin" />
                           <span className="text-sm text-muted-foreground">Escribiendo...</span>
                        </div>
                    </div>
                    )}
                  </div>
                </ScrollArea>

                <form onSubmit={handleSubmit} className="p-3 border-t flex items-center gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Escribe tu pregunta..."
                    className="flex-grow"
                    disabled={isLoading}
                    autoComplete="off"
                  />
                  <Button type="submit" size="icon" disabled={!input.trim() || isLoading}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
            </>
        )}
      </div>
    </>
  );
}

    