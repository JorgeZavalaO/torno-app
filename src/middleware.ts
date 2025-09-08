import { NextRequest, NextResponse } from 'next/server';

// Configuración de caché por rutas
const CACHE_CONFIG = {
  // APIs de solo lectura - caché más agresivo
  '/api/inventory/stock/': { 'cache-control': 'public, max-age=30, s-maxage=60' },
  '/api/dashboard/': { 'cache-control': 'public, max-age=60, s-maxage=120' },
  '/api/costing-params': { 'cache-control': 'public, max-age=1800, s-maxage=3600' },
  
  // APIs transaccionales - sin caché
  '/api/ot/': { 'cache-control': 'no-cache, no-store, must-revalidate' },
  '/api/production/': { 'cache-control': 'no-cache, no-store, must-revalidate' },
  '/api/compras/': { 'cache-control': 'no-cache, no-store, must-revalidate' },
  
  // Páginas estáticas
  '/dashboard': { 'cache-control': 'public, max-age=60, s-maxage=120' },
  '/inventario': { 'cache-control': 'public, max-age=120, s-maxage=240' },
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Headers de seguridad y rendimiento
  const response = NextResponse.next();
  
  // Configurar caché según la ruta
  for (const [route, headers] of Object.entries(CACHE_CONFIG)) {
    if (pathname.startsWith(route)) {
      for (const [key, value] of Object.entries(headers)) {
        response.headers.set(key, value);
      }
      break;
    }
  }
  
  // Headers de seguridad básicos
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin');
  
  // Optimizaciones de CDN
  if (pathname.startsWith('/api/')) {
    response.headers.set('CDN-Cache-Control', 'public, max-age=60');
  }
  
  // CORS básico para APIs
  if (pathname.startsWith('/api/') && request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }
  
  return response;
}

export const config = {
  matcher: [
    // Excluir archivos estáticos
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
  ],
};
