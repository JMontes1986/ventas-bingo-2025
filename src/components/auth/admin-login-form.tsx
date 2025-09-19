
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import React from "react";
import { supabase } from "@/lib/supabase";
import { useAuth, type AdminUser } from "@/context/auth-context";

type CashierRecord = {
  id?: string | number;
  username: string;
  password_hash?: string | null;
  [key: string]: unknown;
};

let bcryptComparePromise: Promise<(password: string, hash: string) => Promise<boolean>> | null = null;

async function loadBcryptCompare() {
  if (!bcryptComparePromise) {
    bcryptComparePromise = import(
      /* webpackIgnore: true */ "https://esm.sh/bcryptjs@2.4.3?target=es2022"
    ).then((module: any) => {
      const compareFn = module?.compare || module?.default?.compare;
      const compareSyncFn = module?.compareSync || module?.default?.compareSync;

      if (typeof compareFn === "function") {
        return compareFn as (password: string, hash: string) => Promise<boolean>;
      }

      if (typeof compareSyncFn === "function") {
        return async (password: string, hash: string) => compareSyncFn(password, hash);
      }

      throw new Error("bcryptjs compare function not found");
    });
  }

  return bcryptComparePromise;
}

async function comparePassword(password: string, hash: string) {
  if (hash.startsWith("$2")) {
    try {
      const compareFn = await loadBcryptCompare();
      return compareFn(password, hash);
    } catch (error) {
      console.error("No se pudo cargar bcryptjs", error);
      throw new Error("No se pudo verificar la contraseña cifrada.");
    }
  }

  return password === hash;
}

const formSchema = z.object({
  username: z
    .string()
    .min(1, "Por favor, introduzca su nombre de usuario.")
    .trim(),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
});

type FormData = z.infer<typeof formSchema>;

export function AdminLoginForm() {
  const { toast } = useToast();
  const router = useRouter();
  const { login } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  async function onSubmit(values: FormData) {
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from<CashierRecord>("cajeros")
        .select("*")
        .eq("username", values.username)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data || !data.password_hash) {
        throw new Error("Credenciales inválidas.");
      }

      const passwordMatches = await comparePassword(values.password, data.password_hash);

      if (!passwordMatches) {
        throw new Error("Credenciales inválidas.");
      }

      const { password_hash, id, ...rest } = data;
      const adminUser: AdminUser = {
        ...rest,
        id: id ? String(id) : data.username,
        username: data.username,
      };

      await login(adminUser);
      toast({
        title: "¡Inicio de Sesión Exitoso!",
        description: "Bienvenido al panel de administración.",
      });
      router.push("/admin");
    } catch (error) {
      console.error("Error signing in: ", error);
      toast({
        variant: "destructive",
        title: "Error de Autenticación",
        description: "Usuario o contraseña incorrectos. Por favor, inténtelo de nuevo.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <Lock className="mx-auto h-12 w-12 text-primary mb-4" />
        <CardTitle className="font-headline text-3xl">Acceso de Administrador</CardTitle>
        <CardDescription>
          Ingrese sus credenciales para gestionar la competencia.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Usuario</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder="usuario.admin" {...field} />
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
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? "Ingresando..." : "Ingresar"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
