
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cajeroSchema, type CajeroFormData, type Cajero } from '@/types';
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
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';


interface CajeroFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CajeroFormData) => Promise<void>;
  cajero: Cajero | null;
}

const CajeroFormDialog = ({ isOpen, onClose, onSubmit, cajero }: CajeroFormDialogProps) => {
  const form = useForm<CajeroFormData>({
    resolver: zodResolver(cajeroSchema),
    defaultValues: {
      nombre_completo: '',
      username: '',
      password: '',
      activo: true,
      can_access_dashboard: false,
      can_access_articles: false,
      can_view_returns: false,
      can_verify_daviplata: false,
      can_access_ai_analysis: false,
      can_view_logs: false,
      can_access_cajeros: false,
    },
  });

  const { handleSubmit, reset, formState: { isSubmitting } } = form;

  useEffect(() => {
    if (isOpen) {
      if (cajero) {
        reset({
          nombre_completo: cajero.nombre_completo,
          username: cajero.username,
          password: '', // Password is not sent from server, so it's always empty for edit
          activo: cajero.activo,
          can_access_dashboard: !!cajero.can_access_dashboard,
          can_access_articles: !!cajero.can_access_articles,
          can_view_returns: !!cajero.can_view_returns,
          can_verify_daviplata: !!cajero.can_verify_daviplata,
          can_access_ai_analysis: !!cajero.can_access_ai_analysis,
          can_view_logs: !!cajero.can_view_logs,
          can_access_cajeros: !!cajero.can_access_cajeros,
        });
      } else {
        reset({
          nombre_completo: '',
          username: '',
          password: '',
          activo: true,
          can_access_dashboard: false,
          can_access_articles: false,
          can_view_returns: false,
          can_verify_daviplata: true, // Default new users to be able to verify
          can_access_ai_analysis: false,
          can_view_logs: false,
          can_access_cajeros: false,
        });
      }
    }
  }, [cajero, reset, isOpen]);

  const handleFormSubmit = async (data: CajeroFormData) => {
    await onSubmit(data);
  };

  const renderSwitchField = (name: keyof CajeroFormData, label: string, description: string) => (
    <FormField
      control={form.control}
      name={name as any}
      render={({ field }) => (
        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
          <div className="space-y-0.5">
            <FormLabel>{label}</FormLabel>
            <FormDescription>{description}</FormDescription>
          </div>
          <FormControl>
            <Switch checked={field.value as boolean} onCheckedChange={field.onChange} />
          </FormControl>
        </FormItem>
      )}
    />
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md grid-rows-[auto_minmax(0,1fr)_auto] p-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>{cajero ? 'Editar Cajero' : 'Crear Nuevo Cajero'}</DialogTitle>
          <DialogDescription>
            {cajero ? 'Actualiza los detalles y permisos del cajero.' : 'Completa el formulario para añadir un nuevo cajero.'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto px-6">
          <Form {...form}>
            <form id="cajero-edit-form" onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="nombre_completo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre Completo</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej: Juan Pérez" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="ej: jperez" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" placeholder={cajero ? 'Dejar en blanco para no cambiar' : '••••••••'} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                  control={form.control}
                  name="activo"
                  render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                          <FormLabel>Usuario Activo</FormLabel>
                          <FormDescription>
                              Permite que el usuario inicie sesión.
                          </FormDescription>
                      </div>
                      <FormControl>
                          <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                          />
                      </FormControl>
                  </FormItem>
                  )}
              />

              <div className="space-y-2 pt-4">
                  <h4 className="font-medium text-center">Permisos</h4>
                  {renderSwitchField("can_access_dashboard", "Dashboard", "Ver métricas y reportes.")}
                  {renderSwitchField("can_access_articles", "Artículos", "Crear y editar artículos.")}
                  {renderSwitchField("can_view_returns", "Devoluciones", "Registrar devoluciones.")}
                  {renderSwitchField("can_verify_daviplata", "Verificar Daviplata", "Verificar y completar pagos.")}
                  {renderSwitchField("can_access_ai_analysis", "Análisis IA", "Acceder al análisis con IA.")}
                  {renderSwitchField("can_view_logs", "Logs", "Ver registros de auditoría.")}
                  {renderSwitchField("can_access_cajeros", "Cajeros", "Gestionar usuarios y permisos.")}
              </div>
            </form>
          </Form>
        </div>
        <DialogFooter className="p-6 pt-4 border-t mt-auto">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button>
          </DialogClose>
          <Button type="submit" form="cajero-edit-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CajeroFormDialog;
