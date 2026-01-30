import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Public routes that don't require authentication
  const publicRoutes = ['/app/login', '/app/register', '/app/password-reset', '/']
  const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname.startsWith(route))
  
  // Check if user is authenticated (has access token)
  const accessToken = request.cookies.get('access_token')
  
  // If accessing protected route without token, redirect to login
  if (!isPublicRoute && !accessToken && request.nextUrl.pathname.startsWith('/app')) {
    const loginUrl = new URL('/app/login', request.url)
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }
  
  // If accessing login/register with token, redirect to dashboard
  if ((request.nextUrl.pathname === '/app/login' || request.nextUrl.pathname === '/app/register') && accessToken) {
    return NextResponse.redirect(new URL('/app/dashboard', request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/app/:path*',
  ],
}

