
'use client';

import { Button } from '@/components/ui/button';
import { HardHat } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-4 text-center">
        <HardHat className="h-24 w-24 text-primary" />
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">
          Ya volvemos...
        </h1>
        <p className="max-w-[600px] text-muted-foreground md:text-xl">
          Estamos trabajando para solucionar un problema en la aplicación.
          Por favor, ten paciencia.
        </p>
        <div className="flex gap-4">
          <Button asChild>
            <Link href="/">Intentar de Nuevo</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/diag">Ir a Diagnóstico</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
