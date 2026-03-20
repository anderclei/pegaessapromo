import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Block /admin on production (Vercel) — only allow on localhost
  if (pathname.startsWith('/admin')) {
    const host = request.headers.get('host') || '';
    const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1');

    if (!isLocal) {
      // Redirect to home on production
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
