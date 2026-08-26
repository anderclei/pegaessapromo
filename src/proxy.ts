import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  // Admin accessibility handled by internal auth or temporarily public for setup
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
