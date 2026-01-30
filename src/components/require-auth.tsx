'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './auth-provider';

interface RequireAuthProps {
  children: React.ReactNode;
}

/**
 * Client-side route protection component
 *
 * Use this to wrap protected pages. It ensures the specific tab has
 * a valid session (the middleware only checks for presence cookie which
 * is shared across all tabs).
 */
export function RequireAuth({ children }: RequireAuthProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);

  // Show nothing while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  // Not authenticated - will redirect
  if (!user) {
    return null;
  }

  return <>{children}</>;
}
