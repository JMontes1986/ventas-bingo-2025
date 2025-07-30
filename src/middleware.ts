
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  const host = request.headers.get('host')

  // Exit early if we're in a local development environment
  if (!host || host.startsWith('localhost')) {
    return NextResponse.next();
  }

  // Si el host comienza con 'www.', redirige a la versión no-www.
  // Es importante verificar que el host no sea nulo para evitar errores.
  if (host.startsWith('www.')) {
    const newHost = host.replace('www.', '');
    const newUrl = new URL(request.url);
    newUrl.host = newHost;
    
    // Usamos un 301 para una redirección permanente, que es lo mejor para el SEO.
    return NextResponse.redirect(newUrl.toString(), 301);
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
