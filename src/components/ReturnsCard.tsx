
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { recordReturn } from '@/app/actions';
import { returnFormSchema } from '@/types';
import type { ReturnFormData, Article, Cajero } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Undo2 } from 'lucide-react';

interface ReturnsCardProps {
    articles: Article[];
    user: Omit<Cajero, 'password'>; // Accept user object without password
    onReturnSuccess: () => void;
}

export default function ReturnsCard({ articles, user, onReturnSuccess }: ReturnsCardProps) {
    const { toast } = useToast();
    const form = useForm<ReturnFormData>({
        resolver: zodResolver(returnFormSchema),
        defaultValues: {
            producto_id: '',
            cantidad: 1,
            cajero_id: user.id
        }
    });

    const { handleSubmit, control, reset, formState: { isSubmitting } } = form;

    const onSubmit = async (data: ReturnFormData) => {
        try {
            // We need to cast the user object to the full Cajero type for the action
            const result = await recordReturn(data, user as Cajero);
            if (result.success) {
                toast({
                    title: "Devolución registrada",
                    description: "La devolución se ha guardado correctamente.",
                });
                reset({ producto_id: '', cantidad: 1, cajero_id: user.id });
                onReturnSuccess(); // Callback to refresh data in parent
            } else {
                throw new Error(result.error || 'Ocurrió un error desconocido.');
            }
        } catch (e) {
             toast({
                variant: 'destructive',
                title: 'Error al registrar la devolución',
                description: (e as Error).message,
            });
        }
    }

    const activeArticles = articles.filter(p => p.activo && !p.nombre.toLowerCase().startsWith('promoción'));

    return (
        <Card className="border-destructive">
            <CardHeader className="p-3">
                 <CardTitle className="flex items-center gap-2 text-base text-destructive">
                    <Undo2 />
                    Registrar Devolución
                </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
                 <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={control}
                            name="producto_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Artículo</FormLabel>
                                    <Select 
                                        onValueChange={field.onChange} 
                                        value={String(field.value) || ''}
                                        disabled={activeArticles.length === 0}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccione un artículo" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {activeArticles.map(p => (
                                                <SelectItem key={p.id} value={String(p.id)}>{p.nombre}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={control}
                            name="cantidad"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cantidad</FormLabel>
                                    <FormControl>
                                        <Input 
                                            type="number" 
                                            min="1" 
                                            {...field} 
                                            onChange={e => field.onChange(Number(e.target.value))}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button variant="destructive" type="submit" className="w-full" disabled={isSubmitting || activeArticles.length === 0}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Registrar Devolución
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
