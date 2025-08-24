// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Refresh session if expired - required for Server Components
  // and for protecting routes.
  await supabase.auth.getSession();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single();

  const userRole = profileData?.role;

  // Protect /admin routes
  if (req.nextUrl.pathname.startsWith('/admin')) {
    if (!user || !userRole || !['admin', 'staff'].includes(userRole)) {
      // If the user is trying to access an admin page and is not an admin/staff
      // Redirect to dashboard or login, depending on authentication state
      if (!user) {
        return NextResponse.redirect(new URL('/login', req.url));
      }
      // If authenticated but not authorized, redirect to customer dashboard
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  // Redirect authenticated users from /login and /signup to /dashboard
  if (user && (req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // If user is not authenticated and trying to access a protected route (customer or admin)
  // But not /login or /signup which are public
  const protectedRoutes = ['/dashboard', '/upload', '/parts', '/quotes', '/account', '/instant-quote'];
  const isAdminRoute = req.nextUrl.pathname.startsWith('/admin');
  const isProtectedCustomerRoute = protectedRoutes.some(route => req.nextUrl.pathname.startsWith(route));

  if (!user && (isProtectedCustomerRoute || isAdminRoute)) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     * This ensures the middleware runs on routes that need protection.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    // Specifically include API routes that need session refresh
    '/api/:path*',
  ],
};
