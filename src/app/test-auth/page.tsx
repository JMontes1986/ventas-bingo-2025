
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { login } from '@/app/actions';

export default function TestAuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleTestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);
    // The login action expects an 'email' field, but we pass the username.
    // The server action is designed to handle this.
    const response = await login({ email, password });
    setResult(response);
    setIsLoading(false);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50 space-y-6">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Página de Diagnóstico de Login</CardTitle>
          <CardDescription>
            Usa este formulario para probar la función de `login` del servidor directamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleTestLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                type="text"
                placeholder="ej: administrador"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isLoading ? 'Probando...' : 'Probar Login'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && (
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Resultado del Servidor</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="p-4 bg-gray-900 text-white rounded-md text-xs overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
