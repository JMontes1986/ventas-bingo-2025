
'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { Cajero } from '@/types';
import { login as loginAction } from '@/app/actions';

type UseAuthProps = {
  requiredPermission?: keyof Omit<Cajero, 'id' | 'username' | 'nombre_completo' | 'activo' | 'password_hash' | 'password'>;
}

const applyPermissions = (user: Cajero): Cajero => {
    // Caso especial para el administrador: siempre tiene todos los permisos.
    if (user.username.toLowerCase() === 'administrador') {
        return {
            ...user,
            can_access_dashboard: true,
            can_access_ai_analysis: true,
            can_access_articles: true,
            can_view_returns: true,
            can_verify_daviplata: true,
            can_view_logs: true,
            can_access_cajeros: true,
        };
    }

    // Caso especial para el cajero de entrada: solo puede verificar Daviplata
    if (user.username.toLowerCase() === 'entrada') {
        return {
            ...user,
            can_access_dashboard: !!user.can_access_dashboard,
            can_access_ai_analysis: !!user.can_access_ai_analysis,
            can_access_articles: !!user.can_access_articles,
            can_view_returns: !!user.can_view_returns,
            can_verify_daviplata: true, // Siempre tiene este permiso
            can_view_logs: !!user.can_view_logs,
            can_access_cajeros: !!user.can_access_cajeros,
        };
    }
    
    // Para los demás usuarios, los permisos se basan en la base de datos.
    return {
        ...user,
        can_access_dashboard: !!user.can_access_dashboard,
        can_access_ai_analysis: !!user.can_access_ai_analysis,
        can_access_articles: !!user.can_access_articles,
        can_view_returns: !!user.can_view_returns,
        can_verify_daviplata: !!user.can_verify_daviplata,
        can_view_logs: !!user.can_view_logs,
        can_access_cajeros: !!user.can_access_cajeros,
    };
};


const useAuth = (options: UseAuthProps = {}) => {
  const { requiredPermission = null } = options;
  const [user, setUser] = useState<Omit<Cajero, 'password'> | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  
  useEffect(() => {
    setLoading(true);
    try {
      const loggedInUserStr = sessionStorage.getItem('loggedInUser');
      if (loggedInUserStr) {
        let loggedInUser: Cajero = JSON.parse(loggedInUserStr);
        
        loggedInUser = applyPermissions(loggedInUser);
        setUser(loggedInUser);

        const hasPermission = requiredPermission 
          ? !!loggedInUser[requiredPermission] 
          : true;
        
        if (!hasPermission) {
          console.warn(`Redirecting: user ${loggedInUser.username} lacks permission ${requiredPermission} for ${pathname}`);
          router.replace('/'); 
        }

      } else {
        setUser(null);
        if (pathname !== '/login' && pathname !== '/daviplata' && !pathname.startsWith('/verificar-daviplata') && pathname !== '/test-auth' && pathname !== '/diagnostico' && pathname !== '/diag') {
          router.replace('/login');
        }
      }
    } catch (e) {
      console.error('Session check failed', e);
      sessionStorage.removeItem('loggedInUser');
      setUser(null);
      if (pathname !== '/login' && pathname !== '/daviplata' && !pathname.startsWith('/verificar-daviplata') && pathname !== '/test-auth' && pathname !== '/diagnostico' && pathname !== '/diag') {
        router.replace('/login');
      }
    } finally {
        setLoading(false);
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'loggedInUser') {
        window.location.reload();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [pathname, requiredPermission, router]);

  const login = async (username: string, password?: string): Promise<{ success: boolean; user?: Omit<Cajero, 'password'>, error?: string }> => {
    const result = await loginAction({ email: username, password });
    if (result.success && result.user) {
        const userWithPermissions = applyPermissions(result.user as Cajero);
        
        sessionStorage.setItem('loggedInUser', JSON.stringify(userWithPermissions));
        setUser(userWithPermissions);
        
        if (userWithPermissions.can_access_dashboard) {
            router.push('/dashboard');
        } else {
            router.push('/');
        }
    }
    return result;
  };

  const logout = () => {
    sessionStorage.removeItem('loggedInUser');
    setUser(null);
    router.push('/login');
  };

  return { user, login, logout, loading };
};

export default useAuth;
