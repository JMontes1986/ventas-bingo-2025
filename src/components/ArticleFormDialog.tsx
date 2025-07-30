
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { articleSchema, type ArticleFormData, type Article } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';

interface ArticleFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ArticleFormData) => Promise<void>;
  article: Article | null;
}

const ArticleFormDialog = ({ isOpen, onClose, onSubmit, article }: ArticleFormDialogProps) => {
  const form = useForm<ArticleFormData>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      nombre: '',
      precio: 0,
      imagen_url: '',
      activo: true,
      stock_inicial: 0,
      visible_cliente: true,
    },
  });

  const { handleSubmit, reset, formState: { isSubmitting } } = form;

  useEffect(() => {
    if (isOpen) {
      if (article) {
        reset({
          nombre: article.nombre,
          precio: article.precio,
          imagen_url: article.imagen_url || '',
          activo: article.activo,
          stock_inicial: article.stock_inicial || 0,
          visible_cliente: article.visible_cliente ?? true,
        });
      } else {
        reset({
          nombre: '',
          precio: 0,
          imagen_url: '',
          activo: true,
          stock_inicial: 0,
          visible_cliente: true,
        });
      }
    }
  }, [article, reset, isOpen]);

  const handleFormSubmit = async (data: ArticleFormData) => {
    await onSubmit(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{article ? 'Editar Artículo' : 'Crear Nuevo Artículo'}</DialogTitle>
          <DialogDescription>
            {article ? 'Actualiza los detalles del artículo.' : 'Completa el formulario para añadir un nuevo artículo.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit(handleFormSubmit)} className="grid gap-4 py-4">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-4">
                  <FormLabel className="text-right">Nombre</FormLabel>
                  <FormControl>
                    <Input {...field} className="col-span-3" placeholder="Ej: Chorizo con arepa" />
                  </FormControl>
                  <div className="col-start-2 col-span-3">
                     <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="precio"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-4">
                  <FormLabel className="text-right">Precio</FormLabel>
                   <FormControl>
                    <Input {...field} type="number" className="col-span-3" placeholder="Ej: 5000" onChange={e => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}/>
                  </FormControl>
                   <div className="col-start-2 col-span-3">
                     <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="stock_inicial"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-4">
                  <FormLabel className="text-right">Stock Inicial</FormLabel>
                   <FormControl>
                    <Input {...field} type="number" className="col-span-3" placeholder="Ej: 100" onChange={e => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}/>
                  </FormControl>
                   <div className="col-start-2 col-span-3">
                     <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="imagen_url"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-4">
                  <FormLabel className="text-right">URL Imagen</FormLabel>
                   <FormControl>
                    <Input {...field} value={field.value ?? ''} className="col-span-3" placeholder="https://ejemplo.com/imagen.png" />
                  </FormControl>
                   <div className="col-start-2 col-span-3">
                     <FormMessage />
                  </div>
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="activo"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-4">
                   <Label htmlFor="activo-switch" className="text-right">Activo</Label>
                  <FormControl>
                    <div className="col-span-3 flex items-center">
                        <Switch
                            id="activo-switch"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                        />
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="visible_cliente"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-4">
                   <Label htmlFor="visible-switch" className="text-right">Visible al Cliente</Label>
                  <FormControl>
                    <div className="col-span-3 flex items-center">
                        <Switch
                            id="visible-switch"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                        />
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
               <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ArticleFormDialog;
