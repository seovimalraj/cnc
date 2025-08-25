import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/admin')) {
    // This relies on a server-side role check in the page too; here we just block obvious anon access.
    const hasSupabaseCookie = req.cookies.has('sb-access-token') || req.cookies.has('sb-refresh-token');
    if (!hasSupabaseCookie) {
      const url = new URL('/login', req.url);
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*']
};
