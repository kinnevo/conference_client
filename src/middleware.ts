import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicRoutes = ['/', '/login', '/register', '/register/success'];

/**
 * Middleware for route protection
 *
 * Since tokens are stored in sessionStorage (per-tab), the middleware can only
 * do basic protection. It blocks unauthenticated access to protected routes
 * but does NOT redirect away from auth pages - that's handled client-side
 * where we can check the actual sessionStorage.
 */
export function middleware(request: NextRequest) {
  const hasSessionCookie = request.cookies.get('hasSession')?.value;
  const pathname = request.nextUrl.pathname;

  const isPublicRoute = publicRoutes.includes(pathname);

  // Only protect dashboard routes - require presence cookie
  // If no cookie, definitely not authenticated in any tab
  if (!isPublicRoute && !hasSessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Don't redirect away from auth pages here - let client-side handle it
  // because only client can check this specific tab's sessionStorage

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
