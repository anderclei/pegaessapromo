import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin accessibility handled by internal auth or temporarily public for setup
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
