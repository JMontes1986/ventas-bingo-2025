
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, CreditCard } from 'lucide-react';
import Image from 'next/image';
import useAuth from '@/hooks/useAuth';
import Link from 'next/link';

export default function LoginPage() {
  const { toast } = useToast();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast({
        variant: 'destructive',
        title: 'Campos requeridos',
        description: 'Por favor, ingrese su usuario y contraseña.',
      });
      return;
    }
    setIsLoading(true);

    const result = await login(username.toLowerCase(), password);

    setIsLoading(false);

    if (!result.success) {
       toast({
        variant: 'destructive',
        title: 'Error de inicio de sesión',
        description: result.error || 'Usuario o contraseña incorrectos. Por favor, intente de nuevo.',
      });
    }
    // En caso de éxito, el hook `useAuth` se encargará de la redirección.
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background space-y-6">
      <Card className="w-full max-w-sm shadow-2xl">
        <CardHeader className="text-center">
          <div className="relative mx-auto mb-4 h-[71px] w-[300px]">
            <Image 
              src="https://btwhvavwqkzifiuhgcao.supabase.co/storage/v1/object/sign/ventas/Logo%20Slogan%20Nuevo%20FINAL-05.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8wYzNjNTVjNy1iNTM4LTQ5MDUtYTIwYy04ZjllZmEwZDk2NjEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ2ZW50YXMvTG9nbyBTbG9nYW4gTnVldm8gRklOQUwtMDUucG5nIiwiaWF0IjoxNzUzNDcwMzEwLCJleHAiOjE3ODUwMDYzMTB9.Q40fD7lHdUFbkADI5zIL_L-DLFrKH2yGGJ75KreeIjw" 
              alt="Logo" 
              fill
              className="object-contain"
              priority
              sizes="300px"
            />
          </div>
          <CardTitle className="text-3xl font-bold text-primary">Ventas Bingo 2025</CardTitle>
          <CardDescription>Ingrese sus credenciales para continuar</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                type="text"
                placeholder="su_usuario"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isLoading ? 'Ingresando...' : 'Ingresar'}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Button asChild variant="outline">
        <Link href="/daviplata">
            <CreditCard className="mr-2 h-4 w-4" />
            Pagar con Daviplata (Autogestión)
        </Link>
      </Button>
    </main>
  );
}
