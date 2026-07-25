import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('aiops_access_token')?.value;
  const path = request.nextUrl.pathname;

  // Paths requiring authentication
  const isProtectedPath =
    path === '/dashboard' ||
    path.startsWith('/agents') ||
    path.startsWith('/prompts') ||
    path.startsWith('/providers') ||
    path.startsWith('/analytics') ||
    path.startsWith('/playground') ||
    path.startsWith('/settings');

  if (isProtectedPath && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Prevent accessing auth screens while logged in
  const isAuthPath = path === '/login' || path === '/register';
  if (isAuthPath && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/agents/:path*',
    '/prompts/:path*',
    '/providers/:path*',
    '/analytics/:path*',
    '/playground/:path*',
    '/settings/:path*',
    '/login',
    '/register',
  ],
};
